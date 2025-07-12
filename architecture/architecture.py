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
            analysis_api = Apigateway("Analysis API\n+ API Key Auth")
            
            with Cluster("Lambda Functions"):
                log_analyzer = Lambda("Log Analyzer\n(S3 Processing)")
                rule_manager = Lambda("Rule Manager\n(WAF Updates)")
                ai_assistant = Lambda("AI Assistant\n(Bedrock)")
            
            # Data storage
            analysis_db = Dynamodb("Analysis Results\n& Rule Metadata")
            
            # AI service
            bedrock = Bedrock("Amazon Bedrock\n(Claude-3)")
        
        with Cluster("Rule Management Features"):
            rule_templates = Lambda("Rule Templates\n(SQLi, XSS, Rate)")
            custom_rules = Lambda("Custom Rules\n(ByteMatch)")
            managed_rules = Lambda("Managed Rules\n(AWS Groups)")
        
        # User interactions
        users >> route53
        attackers >> demo_api
        
        # WAF protection flow
        demo_api << Edge(color="red", style="bold") << demo_waf
        
        # Logging flow
        demo_waf >> Edge(label="WAF Logs", color="blue") >> firehose >> s3_logs
        main_waf >> Edge(label="System Logs", color="blue") >> firehose
        
        # Analysis flow
        users >> cloudfront
        s3_frontend >> Edge(label="API Calls") >> analysis_api
        
        analysis_api >> log_analyzer >> s3_logs
        analysis_api >> rule_manager
        analysis_api >> ai_assistant >> bedrock
        
        # Rule management flow
        rule_manager >> [rule_templates, custom_rules, managed_rules]
        [rule_templates, custom_rules, managed_rules] >> Edge(label="Apply Rules", color="green") >> demo_waf
        
        log_analyzer >> analysis_db
        rule_manager >> analysis_db
        ai_assistant >> analysis_db
        
        # AI-powered feedback loop
        ai_assistant >> Edge(label="Smart Recommendations", style="dashed", color="purple") >> rule_manager

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
    
    with Diagram("Deployment Architecture (Consolidated CDK Stacks)", 
                 filename="architecture/deployment-architecture", 
                 show=False, 
                 direction="TB"):
        
        with Cluster("WafAnalyzerMainStack (Consolidated)"):
            # WAF & Logging
            waf_main = WAF("Main WAF\n+ Rate Limiting")
            s3_logs = S3("Log Bucket\n(Lifecycle)")
            firehose_main = KinesisDataFirehose("Log Delivery\nStream")
            
            # API Layer
            api_gw = Apigateway("Analysis API\n+ API Key")
            lambda_cluster = [
                Lambda("Log Analyzer\n(S3+DynamoDB)"),
                Lambda("Rule Manager\n(WAF Updates)"), 
                Lambda("AI Assistant\n(Bedrock)")
            ]
            dynamodb_main = Dynamodb("Analysis Results\n(Point-in-Time)")
            
            # Frontend
            cloudfront_main = CloudFront("Distribution\n(OAI)")
            s3_frontend = S3("React Frontend\n(Auto-delete)")
        
        with Cluster("WafAnalyzerDemoStack"):
            demo_api = Apigateway("Demo API")
            demo_lambdas = [
                Lambda("Demo Website\n(Attack Sim)"),
                Lambda("Demo API\n(Vulnerable)")
            ]
            demo_db = Dynamodb("Demo Data")
            demo_waf = WAF("Demo WAF\n(Comprehensive)")
        
        with Cluster("External Services"):
            bedrock_service = Bedrock("Amazon Bedrock\n(Claude-3)")
        
        # Consolidated stack internal connections
        waf_main >> firehose_main >> s3_logs
        api_gw >> lambda_cluster[0] >> s3_logs
        api_gw >> lambda_cluster[1] >> waf_main
        api_gw >> lambda_cluster[2] >> bedrock_service
        lambda_cluster >> dynamodb_main
        cloudfront_main >> s3_frontend
        s3_frontend >> Edge(style="dashed", label="API Calls") >> api_gw
        
        # Demo stack connections
        demo_api >> demo_lambdas[0]
        demo_api >> demo_lambdas[1] >> demo_db
        demo_waf >> Edge(label="Demo Logs") >> firehose_main

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