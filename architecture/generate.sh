#!/bin/bash

# AWS WAF Log Analyzer Architecture Diagram Generator
# This script generates architecture diagrams using Infrastructure as Code (Python + Diagrams)

set -e

echo "🏗️  Generating AWS WAF Log Analyzer Architecture Diagrams..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    echo "Please install Python 3 and try again."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Generate diagrams
echo "🎨 Generating architecture diagrams..."
python3 architecture.py

echo ""
echo "✅ Architecture diagrams generated successfully!"
echo ""
echo "Generated files:"
echo "- waf-analyzer-architecture.png (Main architecture)"
echo "- data-flow.png (Data flow diagram)"
echo "- security-architecture.png (Security-focused view)"
echo "- deployment-architecture.png (CDK stacks deployment)"
echo ""
echo "📖 These diagrams are now ready to be included in documentation."

# Deactivate virtual environment
deactivate