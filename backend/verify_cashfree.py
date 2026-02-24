#!/usr/bin/env python3
"""
Cashfree Configuration Verification Script
Run this to verify Cashfree is properly configured in fastapi-payments-example
"""

import os
import sys

# Colors for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def check_mark(condition):
    return f"{GREEN}✓{RESET}" if condition else f"{RED}✗{RESET}"

def print_header(text):
    print(f"\n{BLUE}{'=' * 70}{RESET}")
    print(f"{BLUE}{text:^70}{RESET}")
    print(f"{BLUE}{'=' * 70}{RESET}\n")

def check_env_file():
    """Check if .env file exists and has Cashfree variables"""
    print_header("Checking Environment Configuration")
    
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    
    if not os.path.exists(env_path):
        print(f"{RED}✗ .env file not found!{RESET}")
        print(f"  Expected at: {env_path}")
        return False
    
    print(f"{GREEN}✓ .env file found{RESET}")
    
    with open(env_path, 'r') as f:
        content = f.read()
    
    # Check for Cashfree variables
    checks = {
        'CASHFREE_CLIENT_ID': 'CASHFREE_CLIENT_ID' in content,
        'CASHFREE_CLIENT_SECRET': 'CASHFREE_CLIENT_SECRET' in content,
        'CASHFREE_SANDBOX_MODE': 'CASHFREE_SANDBOX_MODE' in content,
        'CASHFREE_COLLECTION_MODE': 'CASHFREE_COLLECTION_MODE' in content,
    }
    
    all_present = all(checks.values())
    
    for var, present in checks.items():
        status = check_mark(present)
        print(f"  {status} {var}")
    
    return all_present

def check_credentials():
    """Check if Cashfree credentials are set (not just placeholders)"""
    print_header("Checking Credentials")
    
    # Load .env manually
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    env_vars = {}
    
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    
    client_id = env_vars.get('CASHFREE_CLIENT_ID', '')
    client_secret = env_vars.get('CASHFREE_CLIENT_SECRET', '')
    
    id_valid = client_id and 'your_' not in client_id.lower()
    secret_valid = client_secret and 'your_' not in client_secret.lower()
    
    print(f"  {check_mark(id_valid)} Client ID configured")
    if not id_valid:
        print(f"    {YELLOW}Current: {client_id}{RESET}")
    
    print(f"  {check_mark(secret_valid)} Client Secret configured")
    if not secret_valid:
        print(f"    {YELLOW}Current: {client_secret[:20]}...{RESET}" if len(client_secret) > 20 else f"    {YELLOW}Current: {client_secret}{RESET}")
    
    return id_valid and secret_valid

def check_docker_compose():
    """Check if docker-compose.yml has Cashfree configuration"""
    print_header("Checking Docker Compose Configuration")
    
    compose_path = os.path.join(os.path.dirname(__file__), '..', 'docker-compose.yml')
    
    if not os.path.exists(compose_path):
        print(f"{RED}✗ docker-compose.yml not found!{RESET}")
        return False
    
    print(f"{GREEN}✓ docker-compose.yml found{RESET}")
    
    with open(compose_path, 'r') as f:
        content = f.read()
    
    checks = {
        'CASHFREE_CLIENT_ID env var': 'CASHFREE_CLIENT_ID' in content,
        'CASHFREE_CLIENT_SECRET env var': 'CASHFREE_CLIENT_SECRET' in content,
        'CASHFREE_SANDBOX_MODE env var': 'CASHFREE_SANDBOX_MODE' in content,
        'CASHFREE_COLLECTION_MODE env var': 'CASHFREE_COLLECTION_MODE' in content,
        'FRONTEND_URL env var': 'FRONTEND_URL' in content,
        'BACKEND_URL env var': 'BACKEND_URL' in content,
    }
    
    all_present = all(checks.values())
    
    for check, present in checks.items():
        status = check_mark(present)
        print(f"  {status} {check}")
    
    return all_present

def check_config_file():
    """Check if config.py has Cashfree configuration"""
    print_header("Checking Backend Configuration")
    
    config_path = os.path.join(os.path.dirname(__file__), 'config.py')
    
    if not os.path.exists(config_path):
        print(f"{RED}✗ config.py not found!{RESET}")
        return False
    
    print(f"{GREEN}✓ config.py found{RESET}")
    
    with open(config_path, 'r') as f:
        content = f.read()
    
    checks = {
        'get_cashfree_config function': 'def get_cashfree_config()' in content,
        'Cashfree provider registration': 'cashfree' in content.lower() and 'providers[' in content,
    }
    
    all_present = all(checks.values())
    
    for check, present in checks.items():
        status = check_mark(present)
        print(f"  {status} {check}")
    
    return all_present

def check_main_file():
    """Check if main.py has Cashfree in PROVIDER_CAPABILITIES"""
    print_header("Checking Main Application")
    
    main_path = os.path.join(os.path.dirname(__file__), 'main.py')
    
    if not os.path.exists(main_path):
        print(f"{RED}✗ main.py not found!{RESET}")
        return False
    
    print(f"{GREEN}✓ main.py found{RESET}")
    
    with open(main_path, 'r') as f:
        content = f.read()
    
    has_cashfree = 'cashfree' in content.lower() and 'PROVIDER_CAPABILITIES' in content
    
    print(f"  {check_mark(has_cashfree)} Cashfree in PROVIDER_CAPABILITIES")
    
    return has_cashfree

def print_summary(results):
    """Print summary of all checks"""
    print_header("Verification Summary")
    
    all_passed = all(results.values())
    
    for check, passed in results.items():
        status = check_mark(passed)
        print(f"  {status} {check}")
    
    print()
    
    if all_passed:
        print(f"{GREEN}{'✓' * 70}{RESET}")
        print(f"{GREEN}All checks passed! Cashfree is properly configured.{RESET}")
        print(f"{GREEN}{'✓' * 70}{RESET}")
        print()
        print(f"{BLUE}Next steps:{RESET}")
        print(f"  1. Run: docker-compose up --build")
        print(f"  2. Access: http://localhost:3000")
        print(f"  3. Select 'Cashfree' from provider dropdown")
        print()
    else:
        print(f"{RED}{'✗' * 70}{RESET}")
        print(f"{RED}Some checks failed. Please review the errors above.{RESET}")
        print(f"{RED}{'✗' * 70}{RESET}")
        print()
        print(f"{YELLOW}Common fixes:{RESET}")
        print(f"  • Ensure all Cashfree variables are in backend/.env")
        print(f"  • Replace placeholder credentials with real values")
        print(f"  • Check that docker-compose.yml is updated")
        print()
        return 1
    
    return 0

def main():
    print(f"{BLUE}")
    print("╔══════════════════════════════════════════════════════════════════════╗")
    print("║     CASHFREE CONFIGURATION VERIFICATION                              ║")
    print("║     fastapi-payments-example                                         ║")
    print("╚══════════════════════════════════════════════════════════════════════╝")
    print(f"{RESET}")
    
    results = {
        'Environment file (.env)': check_env_file(),
        'Credentials configured': check_credentials(),
        'Docker Compose': check_docker_compose(),
        'Backend config (config.py)': check_config_file(),
        'Main application (main.py)': check_main_file(),
    }
    
    return print_summary(results)

if __name__ == '__main__':
    sys.exit(main())
