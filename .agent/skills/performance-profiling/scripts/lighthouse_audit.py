#!/usr/bin/env python3
"""
Skill: performance-profiling
Script: lighthouse_audit.py
Purpose: Run Lighthouse performance audit on a URL
Usage: python lighthouse_audit.py https://example.com
Output: JSON with performance scores
Note: Requires lighthouse CLI (npm install -g lighthouse)
"""
import subprocess
import json
import sys
import os
import tempfile

def run_lighthouse(url: str) -> dict:
    """Run Lighthouse audit on URL."""
    try:
        with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as f:
            output_path = f.name
        
        # Use npx to locate lighthouse reliably across OS
        base_cmd = "npx"
        if os.name == 'nt':
            base_cmd = "npx.cmd"

        result = subprocess.run(
            [
                base_cmd,
                "lighthouse",
                url,
                "--output=json",
                f"--output-path={output_path}",
                "--chrome-flags=--headless",
                "--only-categories=performance,accessibility,best-practices,seo",
                "--no-enable-error-reporting",
                "--quiet"
            ],
            capture_output=True,
            text=True,
            timeout=180 
        )
        
        if os.path.exists(output_path):
            with open(output_path, 'r') as f:
                report = json.load(f)
            os.unlink(output_path)
            
            categories = report.get("categories", {})
            
            def get_score(cat_id):
                score = categories.get(cat_id, {}).get("score")
                return int(score * 100) if score is not None else 0

            return {
                "url": url,
                "scores": {
                    "performance": get_score("performance"),
                    "accessibility": get_score("accessibility"),
                    "best_practices": get_score("best-practices"),
                    "seo": get_score("seo")
                },
                "summary": get_summary(categories)
            }
        else:
            return {"error": "Lighthouse failed to generate report", "stderr": result.stderr[:500]}
            
    except subprocess.TimeoutExpired:
        return {"error": "Lighthouse audit timed out"}
    except FileNotFoundError:
        return {"error": "Lighthouse CLI not found. Install with: npm install -g lighthouse"}

def get_summary(categories: dict) -> str:
    """Generate summary based on scores."""
    score = categories.get("performance", {}).get("score")
    perf = (score * 100) if score is not None else 0

    if perf >= 90:
        return "[OK] Excellent performance"
    elif perf >= 50:
        return "[!] Needs improvement"
    else:
        return "[X] Poor performance"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python lighthouse_audit.py <url>"}))
        sys.exit(1)
    
    result = run_lighthouse(sys.argv[1])
    print(json.dumps(result, indent=2))
