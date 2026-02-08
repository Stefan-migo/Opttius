#!/bin/bash
# Comprehensive Test Suite Runner

echo "=== Opttius Test Suite ==="
echo "Date: $(date)"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test suite
run_test_suite() {
    local suite_name=$1
    local test_command=$2
    local description=$3
    
    echo -e "${BLUE}Running: $suite_name${NC}"
    echo "$description"
    echo "Command: $test_command"
    echo "---"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✓ $suite_name PASSED${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}✗ $suite_name FAILED${NC}"
        ((FAILED_TESTS++))
    fi
    
    ((TOTAL_TESTS++))
    echo ""
}

# Check if vitest is installed
if ! command -v vitest &> /dev/null; then
    echo -e "${YELLOW}Installing Vitest...${NC}"
    npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
fi

echo "Starting comprehensive test suite..."
echo ""

# Run unit tests
run_test_suite \
    "Unit Tests" \
    "npm run test:unit" \
    "Testing individual components and functions in isolation"

# Run integration tests
run_test_suite \
    "Integration Tests" \
    "npm run test:integration" \
    "Testing interactions between components and services"

# Run API tests
run_test_suite \
    "API Tests" \
    "npm run test:api" \
    "Testing API endpoints and request/response handling"

# Run database tests
run_test_suite \
    "Database Tests" \
    "npm run test:db" \
    "Testing database operations and queries"

# Run security tests
run_test_suite \
    "Security Tests" \
    "npm run test:security" \
    "Testing authentication, authorization, and security measures"

# Run performance tests
run_test_suite \
    "Performance Tests" \
    "npm run test:perf" \
    "Testing response times and resource usage"

# Run end-to-end tests
run_test_suite \
    "End-to-End Tests" \
    "npm run test:e2e" \
    "Testing complete user flows and workflows"

# Generate test coverage report
echo -e "${BLUE}Generating Coverage Report...${NC}"
if npm run test:coverage; then
    echo -e "${GREEN}✓ Coverage report generated${NC}"
else
    echo -e "${YELLOW}⚠ Coverage report generation failed${NC}"
fi

echo ""
echo "=== Test Suite Summary ==="
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
    exit 1
fi