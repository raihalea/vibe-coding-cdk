# Architecture Diagrams

This directory contains Infrastructure as Code (IaC) definitions for generating architecture diagrams of the AWS WAF Log Analyzer system.

## 🏗️ Architecture Diagrams

### 1. Main Architecture (`waf-analyzer-architecture.png`)
Complete system overview showing all components and their relationships:
- Frontend dashboard (React + CloudFront + S3)
- Demo application with WAF protection
- Log collection pipeline (WAF → Kinesis Firehose → S3)
- Analysis backend (API Gateway + Lambda + DynamoDB)
- AI integration (Amazon Bedrock)

### 2. Data Flow (`data-flow.png`)
Detailed data flow from traffic sources through WAF to analysis:
- Traffic sources (legitimate users, attackers)
- WAF processing and logging
- Log analysis pipeline
- AI-powered insights generation

### 3. Security Architecture (`security-architecture.png`)
Security-focused view highlighting attack vectors and defenses:
- Attack types (SQL injection, XSS, rate limiting, etc.)
- WAF rule sets and protection mechanisms
- Real-time detection and response capabilities

### 4. Deployment Architecture (`deployment-architecture.png`)
CDK stack organization and deployment structure:
- Infrastructure components by stack
- Dependencies between stacks
- External service integrations

## 🚀 Generating Diagrams

### Prerequisites
- Python 3.7+
- pip

### Quick Start
```bash
# Navigate to architecture directory
cd architecture

# Run the generation script
./generate.sh
```

### Manual Generation
```bash
# Install dependencies
pip install -r requirements.txt

# Generate all diagrams
python3 architecture.py
```

## 📁 Files

- `architecture.py` - Main IaC script defining all diagrams
- `requirements.txt` - Python dependencies
- `generate.sh` - Automated generation script
- `README.md` - This documentation

## 🔄 Updating Diagrams

When the system architecture changes:

1. Update the relevant diagram definitions in `architecture.py`
2. Run the generation script: `./generate.sh`
3. Commit the updated diagram files
4. Update documentation that references the diagrams

## 📋 Diagram Types

Each diagram serves a specific purpose:

| Diagram | Purpose | Audience |
|---------|---------|----------|
| Main Architecture | Complete system overview | Technical teams, stakeholders |
| Data Flow | Understanding data movement | Developers, data engineers |
| Security Architecture | Security analysis and threat modeling | Security teams, auditors |
| Deployment Architecture | Infrastructure deployment planning | DevOps, infrastructure teams |

## 🎨 Customization

To modify diagrams:

1. Edit `architecture.py`
2. Adjust components, clusters, or connections
3. Run generation script
4. Review generated images

The diagrams use the [diagrams](https://diagrams.mingrammer.com/) library with AWS icons for consistent, professional appearance.

## 📝 Notes

- Diagrams are generated as PNG files with transparent backgrounds
- All diagrams follow the same color scheme and styling
- File names are consistent and descriptive
- Generated files should be committed to version control