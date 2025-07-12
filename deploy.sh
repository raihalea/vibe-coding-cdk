#!/bin/bash

# AWS WAF Log Analyzer - Quick Deployment Script
# This script automates the deployment process with error handling and verification

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION=${AWS_DEFAULT_REGION:-ap-northeast-1}
STACK_PREFIX="WafAnalyzer"

# Logging
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 18.x or later."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version $NODE_VERSION is not supported. Please install Node.js 18.x or later."
        exit 1
    fi
    success "Node.js $(node --version) is installed"
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install AWS CLI v2."
        exit 1
    fi
    success "AWS CLI $(aws --version | cut -d' ' -f1) is installed"
    
    # Check CDK CLI
    if ! command -v cdk &> /dev/null; then
        warning "CDK CLI is not installed. Installing globally..."
        npm install -g aws-cdk
    fi
    success "CDK CLI $(cdk --version) is installed"
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials are not configured. Please run 'aws configure'."
        exit 1
    fi
    
    local AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    local AWS_USER=$(aws sts get-caller-identity --query Arn --output text)
    success "AWS credentials configured for account $AWS_ACCOUNT"
    log "Deploying as: $AWS_USER"
    log "Target region: $AWS_REGION"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    # Root dependencies
    npm install
    success "Root dependencies installed"
    
    # Frontend dependencies
    if [ -d "src/frontend" ]; then
        log "Installing frontend dependencies..."
        cd src/frontend
        npm install
        cd ../..
        success "Frontend dependencies installed"
    fi
}

# Build project
build_project() {
    log "Building project..."
    
    npm run build
    success "Project built successfully"
}

# CDK Bootstrap
bootstrap_cdk() {
    log "Checking CDK bootstrap status..."
    
    local AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    local BOOTSTRAP_STACK="CDKToolkit"
    
    if aws cloudformation describe-stacks --stack-name $BOOTSTRAP_STACK &> /dev/null; then
        success "CDK already bootstrapped"
    else
        log "Bootstrapping CDK..."
        cdk bootstrap aws://$AWS_ACCOUNT/$AWS_REGION
        success "CDK bootstrapped successfully"
    fi
}

# Deploy stacks
deploy_stacks() {
    log "Starting deployment..."
    
    local STACKS=(
        "${STACK_PREFIX}WafStack"
        "${STACK_PREFIX}ApiStack" 
        "${STACK_PREFIX}DemoAppStack"
        "${STACK_PREFIX}DemoWafStack"
        "${STACK_PREFIX}FrontendStack"
    )
    
    if [ "$1" = "--all" ]; then
        log "Deploying all stacks at once..."
        cdk deploy --all --require-approval never
        success "All stacks deployed successfully"
    else
        log "Deploying stacks individually..."
        for stack in "${STACKS[@]}"; do
            log "Deploying $stack..."
            if cdk deploy $stack --require-approval never; then
                success "$stack deployed successfully"
            else
                error "Failed to deploy $stack"
                exit 1
            fi
        done
    fi
}

# Get deployment outputs
get_outputs() {
    log "Retrieving deployment outputs..."
    
    echo ""
    echo "🌐 Deployment Complete! Here are your URLs:"
    echo "=" | head -c 50 && echo ""
    
    # Frontend URL
    local FRONTEND_URL=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_PREFIX}FrontendStack \
        --query 'Stacks[0].Outputs[?OutputKey==`DistributionDomainName`].OutputValue' \
        --output text 2>/dev/null || echo "Not deployed")
    
    if [ "$FRONTEND_URL" != "Not deployed" ]; then
        echo "📊 WAF Analyzer Dashboard: $FRONTEND_URL"
    fi
    
    # Demo App URL
    local DEMO_URL=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_PREFIX}DemoAppStack \
        --query 'Stacks[0].Outputs[?OutputKey==`DemoApiUrl`].OutputValue' \
        --output text 2>/dev/null || echo "Not deployed")
    
    if [ "$DEMO_URL" != "Not deployed" ]; then
        echo "🎯 Demo Application: $DEMO_URL"
        
        # Save demo URL for traffic generation
        echo "export DEMO_URL=\"$DEMO_URL\"" > .env
    fi
    
    # API URL
    local API_URL=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_PREFIX}ApiStack \
        --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
        --output text 2>/dev/null || echo "Not deployed")
    
    if [ "$API_URL" != "Not deployed" ]; then
        echo "🔌 Analysis API: $API_URL"
    fi
    
    echo ""
    echo "🚀 Next Steps:"
    echo "1. Visit the demo application to generate test traffic"
    echo "2. Use the dashboard to analyze WAF logs"
    echo "3. Try the AI assistant for pattern analysis"
    echo ""
    
    if [ "$DEMO_URL" != "Not deployed" ]; then
        echo "💡 Generate test traffic:"
        echo "   node scripts/generate-traffic.js $DEMO_URL --rpm 60 --duration 5"
        echo ""
    fi
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Check if demo app is responding
    local DEMO_URL=$(aws cloudformation describe-stacks \
        --stack-name ${STACK_PREFIX}DemoAppStack \
        --query 'Stacks[0].Outputs[?OutputKey==`DemoApiUrl`].OutputValue' \
        --output text 2>/dev/null)
    
    if [ "$DEMO_URL" != "None" ] && [ ! -z "$DEMO_URL" ]; then
        log "Testing demo application..."
        if curl -s -o /dev/null -w "%{http_code}" "$DEMO_URL" | grep -q "200"; then
            success "Demo application is responding"
        else
            warning "Demo application may not be fully ready yet"
        fi
    fi
    
    # List deployed stacks
    log "Deployed CloudFormation stacks:"
    aws cloudformation list-stacks \
        --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
        --query 'StackSummaries[?starts_with(StackName, `WafAnalyzer`)].{Name:StackName,Status:StackStatus}' \
        --output table
}

# Show help
show_help() {
    echo "AWS WAF Log Analyzer - Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --all          Deploy all stacks at once (faster but less error visibility)"
    echo "  --check        Only check prerequisites"
    echo "  --outputs      Show deployment outputs without deploying"
    echo "  --verify       Verify existing deployment"
    echo "  --help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0             Deploy step by step (recommended)"
    echo "  $0 --all       Deploy all stacks at once"
    echo "  $0 --check     Check if environment is ready for deployment"
    echo "  $0 --outputs   Show URLs of deployed services"
    echo ""
}

# Cleanup function
cleanup() {
    if [ $? -ne 0 ]; then
        error "Deployment failed!"
        echo ""
        echo "🔍 Troubleshooting tips:"
        echo "1. Check AWS CloudFormation console for detailed error messages"
        echo "2. Verify AWS credentials and permissions"
        echo "3. Check CloudWatch Logs for Lambda function errors"
        echo "4. See DEPLOYMENT.md for detailed troubleshooting guide"
    fi
}

# Main execution
main() {
    trap cleanup EXIT
    
    echo "🛡️  AWS WAF Log Analyzer Deployment"
    echo "===================================="
    echo ""
    
    case "${1:-}" in
        --help)
            show_help
            exit 0
            ;;
        --check)
            check_prerequisites
            success "Environment is ready for deployment!"
            exit 0
            ;;
        --outputs)
            get_outputs
            exit 0
            ;;
        --verify)
            verify_deployment
            exit 0
            ;;
        --all)
            check_prerequisites
            install_dependencies
            build_project
            bootstrap_cdk
            deploy_stacks --all
            get_outputs
            verify_deployment
            ;;
        *)
            check_prerequisites
            install_dependencies
            build_project
            bootstrap_cdk
            deploy_stacks
            get_outputs
            verify_deployment
            ;;
    esac
    
    success "Deployment completed successfully! 🎉"
}

# Run main function
main "$@"