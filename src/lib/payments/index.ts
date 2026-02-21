/**
 * Payment gateways factory and exports.
 *
 * @module lib/payments
 */

import type { IPaymentGateway, PaymentIntentResponse } from "./interfaces";
import { FlowGateway } from "./flow/gateway";
import { MercadoPagoGateway } from "./mercadopago/gateway";
import { PayPalGateway } from "./paypal/gateway";
import { NowPaymentsGateway } from "./nowpayments/gateway";

export type PaymentGatewayType =
  | "flow"
  | "mercadopago"
  | "paypal"
  | "nowpayments";

export class PaymentGatewayFactory {
  static getGateway(type: PaymentGatewayType): IPaymentGateway {
    switch (type) {
      case "flow":
        return new FlowGateway();
      case "mercadopago":
        return new MercadoPagoGateway();
      case "paypal":
        return new PayPalGateway();
      case "nowpayments":
        return new NowPaymentsGateway();
      default:
        throw new Error(`Payment gateway ${type} is not supported.`);
    }
  }
}

export type { IPaymentGateway, PaymentIntentResponse } from "./interfaces";
export { PaymentService } from "./services/payment-service";
export {
  PAYMENT_METHOD_MAP,
  PAYMENT_METHODS_ORDER_PAYMENTS,
  type OrderPaymentMethod,
} from "./constants";
