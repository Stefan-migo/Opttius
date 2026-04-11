import { getKnowledgeBase, KnowledgeContext } from "../base/knowledge-manager";

/**
 * Real-World User Query Test Suite
 * Simulates actual user interactions with the AI agent
 */

interface TestCase {
  id: string;
  description: string;
  userQuery: string;
  expectedTopics: string[];
  userRole?: "admin" | "store_manager" | "staff" | "customer";
  context?: Partial<KnowledgeContext>;
  expectedSections?: string[];
}

const REAL_WORLD_TEST_CASES: TestCase[] = [
  // Authentication & Access Scenarios
  {
    id: "auth-001",
    description: "New user trying to log in for the first time",
    userQuery:
      "I can't log into the system. It says my credentials are invalid. What should I do?",
    expectedTopics: ["authentication", "login", "troubleshooting"],
    userRole: "store_manager",
    expectedSections: ["Troubleshooting", "Issue: Invalid Credentials"],
  },
  {
    id: "auth-002",
    description: "Admin configuring user permissions",
    userQuery:
      "How do I add a new staff member and set their access permissions?",
    expectedTopics: ["authentication", "user-management", "permissions"],
    userRole: "admin",
    expectedSections: ["Workflow 2: User Permission Management"],
  },

  // Appointment Scheduling Scenarios
  {
    id: "appt-001",
    description: "Customer service representative scheduling appointments",
    userQuery:
      "I need to book an eye exam for Maria Rodriguez this Friday at 2 PM with Dr. Smith",
    expectedTopics: ["appointments", "scheduling", "calendar"],
    userRole: "staff",
    expectedSections: ["Workflow 1: Creating a New Appointment"],
  },
  {
    id: "appt-002",
    description: "Handling double booking conflict",
    userQuery:
      "The system is showing two appointments at the same time for Dr. Johnson. How do I fix this?",
    expectedTopics: ["appointments", "conflict-resolution", "troubleshooting"],
    userRole: "store_manager",
    expectedSections: ["Troubleshooting", "Issue: Double Booking Detected"],
  },
  {
    id: "appt-003",
    description: "Managing staff availability during peak hours",
    userQuery:
      "We're getting overwhelmed with appointments during lunch rush. How can we better manage our schedule?",
    expectedTopics: ["appointments", "staff-scheduling", "peak-hours"],
    userRole: "store_manager",
    expectedSections: ["Use Case 1: Peak Hour Management"],
  },

  // Product Management Scenarios
  {
    id: "prod-001",
    description: "Adding new eyeglass frames to inventory",
    userQuery:
      "I received a shipment of new Ray-Ban frames. How do I add them to our catalog?",
    expectedTopics: ["products", "inventory", "catalog-management"],
    userRole: "store_manager",
    expectedSections: ["Workflow 1: Adding New Products"],
  },
  {
    id: "prod-002",
    description: "Handling low stock alerts",
    userQuery:
      "The system is warning me about low stock for several products. What's the best way to handle this?",
    expectedTopics: ["products", "inventory", "low-stock"],
    userRole: "store_manager",
    expectedSections: [
      "Workflow 2: Managing Product Inventory",
      "Configuration Options",
    ],
  },
  {
    id: "prod-003",
    description: "Resolving duplicate SKU errors",
    userQuery:
      "I'm getting an error that the SKU already exists when trying to add a new product. Help!",
    expectedTopics: ["products", "sku-management", "troubleshooting"],
    userRole: "admin",
    expectedSections: ["Troubleshooting", "Issue: Duplicate SKU Error"],
  },

  // Payment Processing Scenarios
  {
    id: "pay-001",
    description: "Processing customer payment at checkout",
    userQuery:
      "A customer wants to pay with cryptocurrency. How do I process this through NOWPayments?",
    expectedTopics: ["payments", "cryptocurrency", "nowpayments"],
    userRole: "staff",
    expectedSections: [
      "Workflow 1: Processing Customer Payments",
      "Payment Gateway Integration",
    ],
  },
  {
    id: "pay-002",
    description: "Configuring payment gateways",
    userQuery:
      "I need to set up Mercado Pago for our Argentine customers. What credentials do I need?",
    expectedTopics: ["payments", "mercado-pago", "gateway-setup"],
    userRole: "admin",
    expectedSections: ["Workflow 2: Configuring Payment Gateways"],
  },
  {
    id: "pay-003",
    description: "Handling payment disputes",
    userQuery:
      "A customer is disputing a charge from last week. What's our process for handling this?",
    expectedTopics: ["payments", "disputes", "chargebacks"],
    userRole: "store_manager",
    expectedSections: ["Workflow 3: Handling Payment Disputes and Refunds"],
  },

  // Cross-Module Integration Scenarios
  {
    id: "int-001",
    description: "End-to-end customer journey from appointment to payment",
    userQuery:
      "Walk me through the complete process from booking an eye exam to receiving payment",
    expectedTopics: ["appointments", "payments", "workflow-integration"],
    userRole: "store_manager",
    expectedSections: [
      "Workflow 1: Creating a New Appointment",
      "Workflow 1: Processing Customer Payments",
    ],
  },
  {
    id: "int-002",
    description: "Seasonal inventory management with appointment planning",
    userQuery:
      "How should we prepare our inventory and staff schedules for the back-to-school rush?",
    expectedTopics: ["products", "appointments", "seasonal-planning"],
    userRole: "store_manager",
    expectedSections: [
      "Use Case 1: Seasonal Inventory Management",
      "Use Case 1: Peak Hour Management",
    ],
  },
];

export class RealWorldTestingSuite {
  private knowledgeBase = getKnowledgeBase();

  async runAllTests(): Promise<TestResults> {
    const results: TestResult[] = [];

    for (const testCase of REAL_WORLD_TEST_CASES) {
      const result = await this.runSingleTest(testCase);
      results.push(result);
    }

    return this.generateSummary(results);
  }

  private async runSingleTest(testCase: TestCase): Promise<TestResult> {
    console.log(`\n🧪 Running Test: ${testCase.id} - ${testCase.description}`);
    console.log(`👤 User Role: ${testCase.userRole || "unspecified"}`);
    console.log(`💬 Query: "${testCase.userQuery}"`);

    try {
      const context: KnowledgeContext = {
        userId: "test-user-123",
        organizationId: "test-org-456",
        userRole: testCase.userRole,
        recentActions: [],
        ...(testCase.context || {}),
      };

      // Search for relevant knowledge
      const searchResults = await this.knowledgeBase.searchKnowledge(
        testCase.userQuery,
        context,
      );

      // Validate results
      const validation = this.validateResults(searchResults, testCase);

      const result: TestResult = {
        testCaseId: testCase.id,
        passed: validation.passed,
        score: validation.score,
        findings: validation.findings,
        searchResults: searchResults.slice(0, 3), // Top 3 results
        executionTime: Date.now(),
      };

      console.log(
        `✅ Test ${validation.passed ? "PASSED" : "FAILED"} (Score: ${validation.score}/100)`,
      );
      return result;
    } catch (error) {
      console.error(`❌ Test Failed with Error:`, error);
      return {
        testCaseId: testCase.id,
        passed: false,
        score: 0,
        findings: [
          `Execution Error: ${error instanceof Error ? error.message : String(error)}`,
        ],
        searchResults: [],
        executionTime: Date.now(),
      };
    }
  }

  private validateResults(
    searchResults: unknown[],
    testCase: TestCase,
  ): ValidationResult {
    const findings: string[] = [];
    let score = 0;
    const maxScore = 100;

    // Check if we found relevant documents
    if (searchResults.length === 0) {
      findings.push("❌ No relevant documents found");
      return { passed: false, score: 0, findings };
    }

    // Check topic relevance (20 points)
    const foundTopics = new Set(
      searchResults.flatMap((r) => r.metadata?.tags || []),
    );
    const expectedTopics = new Set(testCase.expectedTopics || []);
    const topicMatches = [...expectedTopics].filter((topic) =>
      foundTopics.has(topic),
    );
    const topicScore = (topicMatches.length / expectedTopics.size) * 20;
    score += topicScore;
    findings.push(
      `📊 Topic Relevance: ${topicMatches.length}/${expectedTopics.size} topics matched (${Math.round(topicScore)}/20 points)`,
    );

    // Check section coverage (30 points)
    if (testCase.expectedSections) {
      const foundSections = new Set(
        searchResults.flatMap(
          (r) => r.sections?.map((s: unknown) => s.title) || [],
        ),
      );
      const expectedSections = new Set(testCase.expectedSections);
      const sectionMatches = [...expectedSections].filter((section) =>
        foundSections.has(section),
      );
      const sectionScore = (sectionMatches.length / expectedSections.size) * 30;
      score += sectionScore;
      findings.push(
        `📋 Section Coverage: ${sectionMatches.length}/${expectedSections.size} sections found (${Math.round(sectionScore)}/30 points)`,
      );
    } else {
      score += 30; // Full points if no specific sections expected
      findings.push(
        "📋 Section Coverage: No specific sections required (30/30 points)",
      );
    }

    // Check content relevance (30 points)
    const relevanceScores = searchResults.map((r) => r.relevanceScore || 0);
    const avgRelevance =
      relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length;
    const relevanceScore = Math.min(avgRelevance * 30, 30);
    score += relevanceScore;
    findings.push(
      `🔍 Content Relevance: Average score ${avgRelevance.toFixed(2)} (${Math.round(relevanceScore)}/30 points)`,
    );

    // Check result quantity appropriateness (20 points)
    const idealResultCount = testCase.expectedTopics?.length || 2;
    const countDifference = Math.abs(searchResults.length - idealResultCount);
    const countScore = Math.max(0, 20 - countDifference * 5);
    score += countScore;
    findings.push(
      `🔢 Result Count: ${searchResults.length} results (ideal: ${idealResultCount}) (${Math.round(countScore)}/20 points)`,
    );

    const passed = score >= 70; // 70% threshold
    findings.unshift(
      `${passed ? "✅" : "❌"} Overall Score: ${Math.round(score)}/100 (${passed ? "PASS" : "FAIL"})`,
    );

    return { passed, score, findings };
  }

  private generateSummary(results: TestResult[]): TestResults {
    const totalTests = results.length;
    const passedTests = results.filter((r) => r.passed).length;
    const failedTests = totalTests - passedTests;
    const averageScore =
      results.reduce((sum, r) => sum + r.score, 0) / totalTests;

    const summary: TestResults = {
      timestamp: new Date().toISOString(),
      totalTests,
      passedTests,
      failedTests,
      passRate: (passedTests / totalTests) * 100,
      averageScore,
      detailedResults: results,
      recommendations: this.generateRecommendations(results),
    };

    console.log("\n" + "=".repeat(60));
    console.log("📊 TEST SUITE SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} (${summary.passRate.toFixed(1)}%)`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Average Score: ${averageScore.toFixed(1)}/100`);
    console.log("=".repeat(60));

    return summary;
  }

  private generateRecommendations(results: TestResult[]): string[] {
    const recommendations: string[] = [];
    const failedTests = results.filter((r) => !r.passed);

    if (failedTests.length > 0) {
      recommendations.push(
        "❌ Some tests failed - review knowledge base content coverage",
      );
    }

    if (results.some((r) => r.score < 50)) {
      recommendations.push(
        "⚠️ Low-scoring tests indicate need for better content organization",
      );
    }

    const avgTopicScore =
      results.reduce((sum, r) => {
        const topicFinding = r.findings.find((f) =>
          f.includes("Topic Relevance"),
        );
        const scoreMatch = topicFinding?.match(/(\d+)\/\d+ points/);
        return sum + (scoreMatch ? parseInt(scoreMatch[1]) : 0);
      }, 0) / results.length;

    if (avgTopicScore < 15) {
      recommendations.push(
        "📌 Improve topic tagging and categorization in documentation",
      );
    }

    return recommendations;
  }
}

// Types
interface TestResult {
  testCaseId: string;
  passed: boolean;
  score: number;
  findings: string[];
  searchResults: unknown[];
  executionTime: number;
}

interface ValidationResult {
  passed: boolean;
  score: number;
  findings: string[];
}

interface TestResults {
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  passRate: number;
  averageScore: number;
  detailedResults: TestResult[];
  recommendations: string[];
}

// Export for external use
export { REAL_WORLD_TEST_CASES };
export type { TestCase, TestResult, TestResults };
