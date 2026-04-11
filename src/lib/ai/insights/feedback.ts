import { DatabaseInsight, InsightFeedback, InsightSection } from "./schemas";

export class InsightFeedbackSystem {
  private supabase: unknown;

  constructor(supabase: unknown) {
    this.supabase = supabase;
  }

  /**
   * Collects feedback for a specific insight and updates user preferences
   */
  async collectFeedback(
    insightId: string,
    feedback: InsightFeedback,
  ): Promise<void> {
    const { error } = await this.supabase
      .from("ai_insights")
      .update({
        feedback_score: feedback.score,
        updated_at: new Date().toISOString(),
      })
      .eq("id", insightId);

    if (error) {
      console.error("Error collecting feedback:", error);
      throw error;
    }

    // In a future version, we would update a user_preferences table here
    // based on the metadata/type of the insight rated.
    if (feedback.score >= 4) {
      // High score: Learn preference
      // await this.reinforcePreference(insightId);
    }
  }

  /**
   * Retrieves insights, personalized based on past engagement and current context
   */
  async getPersonalizedInsights(
    organizationId: string,
    section: InsightSection,
  ): Promise<DatabaseInsight[]> {
    const { data, error } = await this.supabase
      .from("ai_insights")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("section", section)
      .eq("is_dismissed", false)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching insights:", error);
      throw error;
    }

    // Basic personalization: Filter out stale high-priority insights if they haven't been acted on?
    // For now, simply return the fetched insights.
    return data || [];
  }
}
