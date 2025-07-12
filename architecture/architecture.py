#!/usr/bin/env python3
"""
AWS WAF Log Analyzer Architecture Diagram
Generated using Diagrams library (Infrastructure as Code)
"""

from diagrams import Diagram, Cluster, Edge
from diagrams.aws.analytics import KinesisDataFirehose
from diagrams.aws.compute import Lambda
from diagrams.aws.database import Dynamodb
from diagrams.aws.integration import Apigateway
from diagrams.aws.ml import Bedrock
from diagrams.aws.network import CloudFront, Route53
from diagrams.aws.security import WAF
from diagrams.aws.storage import S3
from diagrams.onprem.client import Users
from diagrams.programming.framework import React

def create_architecture_diagram():
    """Create the complete AWS WAF Log Analyzer architecture diagram"""
    
    with Diagram("AWS WAF Log Analyzer Architecture", 
                 filename="architecture/waf-analyzer-architecture", 
                 show=False, 
                 direction="TB"):
        
        # Users
        users = Users("Security Teams")
        attackers = Users("Attackers/Bots")
        
        with Cluster("Frontend (WAF Analyzer Dashboard)"):
            # Frontend Infrastructure
            route53 = Route53("DNS")
            cloudfront = CloudFront("CloudFront")
            s3_frontend = S3("React App\n(S3)")
            
            route53 >> cloudfront >> s3_frontend
        
        with Cluster("Demo Application"):
            # Demo app protected by WAF
            demo_api = Apigateway("Demo API\nGateway")
            demo_lambda = Lambda("Demo Website\n& API")
            demo_dynamodb = Dynamodb("Demo Data")
            
            demo_api >> demo_lambda >> demo_dynamodb
        
        with Cluster("WAF Protection Layer"):
            # WAF components
            demo_waf = WAF("Demo WAF\n(Comprehensive Rules)")
            main_waf = WAF("Main WAF\n(Log Collection)")
            
        with Cluster("Log Collection & Storage"):
            # Log processing pipeline
            firehose = KinesisDataFirehose("Kinesis\nFirehose")
            s3_logs = S3("WAF Logs\n(S3)")
            
        with Cluster("Analysis Backend"):
            # Analysis API
            analysis_api = Apigateway("Analysis API\nGateway")
            
            with Cluster("Lambda Functions"):
                log_analyzer = Lambda("Log Analyzer")
                rule_manager = Lambda("Rule Manager")
                ai_assistant = Lambda("AI Assistant")
            
            # Data storage
            analysis_db = Dynamodb("Analysis\nResults")
            
            # AI service
            bedrock = Bedrock("Amazon Bedrock\n(Claude)")
        
        # User interactions
        users >> route53
        attackers >> demo_api
        
        # WAF protection flow
        demo_api << Edge(color="red", style="bold") << demo_waf
        
        # Logging flow
        demo_waf >> Edge(label="WAF Logs") >> firehose >> s3_logs
        main_waf >> Edge(label="System Logs") >> firehose
        
        # Analysis flow
        users >> cloudfront
        s3_frontend >> Edge(label="API Calls") >> analysis_api
        
        analysis_api >> log_analyzer >> s3_logs
        analysis_api >> rule_manager >> demo_waf
        analysis_api >> ai_assistant >> bedrock
        
        log_analyzer >> analysis_db
        rule_manager >> analysis_db
        ai_assistant >> analysis_db
        
        # Feedback loop
        ai_assistant >> Edge(label="Rule Recommendations", style="dashed") >> rule_manager

def create_data_flow_diagram():
    """Create data flow diagram"""
    
    with Diagram("WAF Log Analysis Data Flow", 
                 filename="architecture/data-flow", 
                 show=False, 
                 direction="LR"):
        
        # Traffic sources
        legitimate = Users("Legitimate\nUsers")
        malicious = Users("Malicious\nTraffic")
        
        # Demo application
        demo_app = Apigateway("Demo\nApplication")
        
        # WAF processing
        waf = WAF("AWS WAF")
        
        # Log pipeline
        firehose = KinesisDataFirehose("Kinesis\nFirehose")
        s3 = S3("S3 Logs\n(Compressed)")
        
        # Analysis engine
        analyzer = Lambda("Log\nAnalyzer")
        ai = Bedrock("AI Analysis\n(Bedrock)")
        
        # Results
        dashboard = React("Security\nDashboard")
        
        # Flow connections
        legitimate >> demo_app
        malicious >> demo_app
        
        demo_app >> waf >> Edge(label="Allow/Block") >> demo_app
        waf >> Edge(label="Logs", color="blue") >> firehose >> s3
        
        s3 >> Edge(label="Parse & Analyze") >> analyzer
        analyzer >> Edge(label="Pattern Recognition") >> ai
        ai >> Edge(label="Insights") >> dashboard

def create_security_architecture():
    """Create security-focused architecture diagram"""
    
    with Diagram("Security Architecture & Attack Flow", 
                 filename="architecture/security-architecture", 
                 show=False, 
                 direction="TB"):
        
        with Cluster("Attack Vectors"):
            sql_injection = Users("SQL Injection")
            xss_attacks = Users("XSS Attacks")
            rate_limit = Users("Rate Limiting")
            bot_traffic = Users("Bot Traffic")
            admin_access = Users("Admin Access\nAttempts")
        
        with Cluster("WAF Rule Sets"):
            common_rules = WAF("Common\nRule Set")
            sqli_rules = WAF("SQLi\nRule Set")
            known_bad = WAF("Known Bad\nInputs")
            rate_rules = WAF("Rate Based\nRules")
            custom_rules = WAF("Custom\nRules")
        
        with Cluster("Detection & Analysis"):
            log_analysis = Lambda("Real-time\nLog Analysis")
            pattern_detection = Lambda("Pattern\nDetection")
            ai_analysis = Bedrock("AI Threat\nAnalysis")
        
        with Cluster("Response & Mitigation"):
            auto_block = WAF("Automatic\nBlocking")
            rule_updates = Lambda("Dynamic Rule\nUpdates")
            alerts = Lambda("Security\nAlerts")
        
        # Attack flow
        sql_injection >> sqli_rules
        xss_attacks >> common_rules
        rate_limit >> rate_rules
        bot_traffic >> custom_rules
        admin_access >> custom_rules
        
        # Analysis flow
        [common_rules, sqli_rules, known_bad, rate_rules, custom_rules] >> log_analysis
        log_analysis >> pattern_detection >> ai_analysis
        
        # Response flow
        ai_analysis >> [auto_block, rule_updates, alerts]

def create_deployment_architecture():
    """Create deployment and infrastructure diagram"""
    
    with Diagram("Deployment Architecture (CDK Stacks)", 
                 filename="architecture/deployment-architecture", 
                 show=False, 
                 direction="TB"):
        
        with Cluster("WafAnalyzerWafStack"):
            waf_main = WAF("Main WAF")
            s3_logs = S3("Log Bucket")
            firehose_main = KinesisDataFirehose("Log Delivery")
        
        with Cluster("WafAnalyzerApiStack"):
            api_gw = Apigateway("Analysis API")
            lambda_cluster = [
                Lambda("Log Analyzer"),
                Lambda("Rule Manager"), 
                Lambda("AI Assistant")
            ]
            dynamodb_main = Dynamodb("Analysis DB")
        
        with Cluster("WafAnalyzerFrontendStack"):
            cloudfront_main = CloudFront("Distribution")
            s3_frontend = S3("Frontend Assets")
        
        with Cluster("WafAnalyzerDemoAppStack"):
            demo_api = Apigateway("Demo API")
            demo_lambdas = [
                Lambda("Demo Website"),
                Lambda("Demo API")
            ]
            demo_db = Dynamodb("Demo Data")
        
        with Cluster("WafAnalyzerDemoWafStack"):
            demo_waf = WAF("Demo WAF")
            firehose_demo = KinesisDataFirehose("Demo Logs")
        
        with Cluster("External Services"):
            bedrock_service = Bedrock("Bedrock")
        
        # Dependencies
        demo_waf >> firehose_demo >> s3_logs
        waf_main >> firehose_main >> s3_logs
        
        api_gw >> lambda_cluster[0] >> s3_logs
        lambda_cluster[1] >> demo_waf
        lambda_cluster[2] >> bedrock_service
        
        cloudfront_main >> s3_frontend
        s3_frontend >> Edge(style="dashed") >> api_gw

if __name__ == "__main__":
    print("Generating AWS WAF Log Analyzer architecture diagrams...")
    
    create_architecture_diagram()
    print("✓ Main architecture diagram created")
    
    create_data_flow_diagram()
    print("✓ Data flow diagram created")
    
    create_security_architecture()
    print("✓ Security architecture diagram created")
    
    create_deployment_architecture()
    print("✓ Deployment architecture diagram created")
    
    print("\nAll architecture diagrams generated successfully!")
    print("Files created in architecture/ directory:")
    print("- waf-analyzer-architecture.png")
    print("- data-flow.png") 
    print("- security-architecture.png")
    print("- deployment-architecture.png")