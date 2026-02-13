import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getBranchContext } from "@/lib/api/branch-middleware";
import { appLogger as logger } from "@/lib/logger";

// GET /api/admin/internal-orders - List internal orders
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get branch context
    const branchContext = await getBranchContext(req, user.id, supabase);
    if (!branchContext.branchId && !branchContext.isGlobalView) {
      return NextResponse.json(
        { error: 'No branch access' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const originBranch = searchParams.get('origin_branch_id');
    const destinationBranch = searchParams.get('destination_branch_id');

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('internal_orders')
      .select(`
        *,
        origin_branch:branches!internal_orders_origin_branch_id_fkey(name, code),
        destination_branch:branches!internal_orders_destination_branch_id_fkey(name, code),
        created_by_user:admin_users!internal_orders_created_by_fkey(first_name, last_name),
        assigned_driver:drivers(name, license_number),
        assigned_vehicle:vehicles(plate_number, model),
        items:internal_order_items(
          *,
          product:products(name, sku)
        )
      `, { count: 'exact' })
      .eq('organization_id', branchContext.organizationId);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (originBranch) {
      query = query.eq('origin_branch_id', originBranch);
    }

    if (destinationBranch) {
      query = query.eq('destination_branch_id', destinationBranch);
    }

    // Apply branch context filter (orders involving user's branch)
    if (!branchContext.isSuperAdmin) {
      query = query.or(
        `origin_branch_id.eq.${branchContext.branchId},destination_branch_id.eq.${branchContext.branchId}`
      );
    }

    // Execute query with pagination
    const { data: orders, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to fetch internal orders', { error: error.message });
      return NextResponse.json(
        { error: 'Failed to fetch internal orders' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count! / limit)
      }
    });

  } catch (error) {
    logger.error('Internal orders list error', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/internal-orders - Create new internal order
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get branch context
    const branchContext = await getBranchContext(req, user.id, supabase);
    if (!branchContext.branchId && !branchContext.isGlobalView) {
      return NextResponse.json(
        { error: 'No branch access' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      origin_branch_id,
      destination_branch_id,
      priority = 'medium',
      scheduled_date,
      notes,
      items
    } = body;

    // Validation
    if (!origin_branch_id || !destination_branch_id) {
      return NextResponse.json(
        { error: 'Origin and destination branches are required' },
        { status: 400 }
      );
    }

    if (origin_branch_id === destination_branch_id) {
      return NextResponse.json(
        { error: 'Origin and destination branches must be different' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }

    // Verify branch access
    if (!branchContext.isSuperAdmin) {
      const userBranches = await supabase
        .from('admin_branch_access')
        .select('branch_id')
        .eq('admin_user_id', user.id);

      const accessibleBranchIds = userBranches.data?.map((b: any) => b.branch_id) || [];

      if (!accessibleBranchIds.includes(origin_branch_id) && !accessibleBranchIds.includes(destination_branch_id)) {
        return NextResponse.json(
          { error: 'Access denied to one or both branches' },
          { status: 403 }
        );
      }
    }

    // Generate order number
    const { data: orderNumberData, error: orderNumberError } = await supabase
      .rpc('generate_internal_order_number', { org_id: branchContext.organizationId });

    if (orderNumberError) {
      logger.error('Failed to generate order number', { error: orderNumberError.message });
      return NextResponse.json(
        { error: 'Failed to generate order number' },
        { status: 500 }
      );
    }

    // Create internal order
    const { data: order, error: orderError } = await supabase
      .from('internal_orders')
      .insert({
        order_number: orderNumberData,
        origin_branch_id,
        destination_branch_id,
        status: 'pending',
        priority,
        scheduled_date,
        notes,
        created_by: user.id,
        organization_id: branchContext.organizationId
      })
      .select()
      .single();

    if (orderError) {
      logger.error('Failed to create internal order', { error: orderError.message });
      return NextResponse.json(
        { error: 'Failed to create internal order' },
        { status: 500 }
      );
    }

    // Create order items
    const orderItems = items.map((item: any) => ({
      internal_order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      notes: item.notes
    }));

    const { error: itemsError } = await supabase
      .from('internal_order_items')
      .insert(orderItems);

    if (itemsError) {
      logger.error('Failed to create order items', { error: itemsError.message });
      // Rollback - delete the order
      await supabase.from('internal_orders').delete().eq('id', order.id);
      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      );
    }

    // Fetch complete order with relations
    const { data: completeOrder } = await supabase
      .from('internal_orders')
      .select(`
        *,
        origin_branch:branches!internal_orders_origin_branch_id_fkey(name, code),
        destination_branch:branches!internal_orders_destination_branch_id_fkey(name, code),
        created_by_user:admin_users!internal_orders_created_by_fkey(first_name, last_name),
        items:internal_order_items(
          *,
          product:products(name, sku)
        )
      `)
      .eq('id', order.id)
      .single();

    logger.info('Internal order created', {
      orderId: order.id,
      orderNumber: order.order_number,
      userId: user.id
    });

    return NextResponse.json(completeOrder, { status: 201 });

  } catch (error) {
    logger.error('Internal order creation error', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
