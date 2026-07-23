/**
 * Incident Response — Playbook and containment strategy data.
 *
 * @module lib/security/incident-response/playbooks
 */

import type {
  ContainmentStrategy,
  IncidentCategory,
  ResponsePlaybook,
} from "./types";

export const loadResponsePlaybooks = (): ResponsePlaybook[] => [
  {
    id: "pb-001",
    name: "Unauthorized Access Response",
    category: "unauthorized_access",
    triggerConditions: [
      "multiple_failed_logins",
      "account_lockout",
      "suspicious_login_location",
    ],
    responseSteps: [
      {
        id: "contain-network-access",
        title: "Contain Network Access",
        description: "Block suspicious IP addresses and restrict access",
        actionType: "automated",
        responsibleTeam: "security-operations",
        dependencies: [],
      },
      {
        id: "reset-credentials",
        title: "Reset Credentials",
        description: "Force password reset for affected accounts",
        actionType: "manual",
        responsibleTeam: "identity-management",
        dependencies: ["contain-network-access"],
      },
    ],
    escalationPath: ["security-manager", "cio"],
    requiredResources: ["firewall-access", "identity-provider-api"],
    estimatedResolutionTime: "2-4 hours",
  },
];

export const loadContainmentStrategies = (): ContainmentStrategy[] => [
  {
    id: "cs-001",
    name: "Network Isolation",
    description:
      "Isolate affected systems from network to prevent lateral movement",
    actions: [
      "Block network traffic to/from affected systems",
      "Move systems to quarantine VLAN",
      "Disable unnecessary network services",
    ],
    rollbackPlan: [
      "Restore network connectivity gradually",
      "Verify system integrity before reconnecting",
      "Monitor for reinfection signs",
    ],
    impactAssessment: "Temporary service disruption, minimal data loss risk",
  },
];

export const getRemediationSteps = (
  category: IncidentCategory,
): string[] => {
  const remediationMap: Record<IncidentCategory, string[]> = {
    unauthorized_access: [
      "Reset compromised credentials",
      "Review and revoke unnecessary access",
      "Implement additional authentication factors",
      "Conduct user security awareness training",
    ],
    data_breach: [
      "Identify and contain data exfiltration",
      "Assess data sensitivity and impact",
      "Notify affected parties as required",
      "Implement enhanced data protection measures",
    ],
    malware_infection: [
      "Isolate infected systems",
      "Perform malware analysis",
      "Clean or rebuild affected systems",
      "Update antivirus signatures and definitions",
    ],
    denial_of_service: [
      "Implement rate limiting",
      "Activate DDoS protection services",
      "Scale infrastructure resources",
      "Coordinate with ISP/network providers",
    ],
    phishing_attack: [
      "Block malicious email sources",
      "Educate targeted users",
      "Reset compromised accounts",
      "Enhance email security filters",
    ],
    insider_threat: [
      "Review user access and permissions",
      "Monitor for additional suspicious activity",
      "Conduct personnel investigation",
      "Implement principle of least privilege",
    ],
    configuration_error: [
      "Review and correct configuration changes",
      "Implement configuration validation",
      "Roll back problematic changes",
      "Document proper configuration procedures",
    ],
    vulnerability_exploit: [
      "Apply security patches immediately",
      "Implement compensating controls",
      "Scan for similar vulnerabilities",
      "Update vulnerability management processes",
    ],
  };

  return (
    remediationMap[category] || [
      "Investigate incident",
      "Document findings",
      "Implement corrective measures",
    ]
  );
};
