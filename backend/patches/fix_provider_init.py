"""
Patch the fastapi_payments provider module to fix the syntax error.
This script should be run before starting the application.
"""
import os

def fix_provider_init():
    try:
        # Find the package path
        import fastapi_payments
        package_path = os.path.dirname(fastapi_payments.__file__)
        provider_init_path = os.path.join(package_path, 'providers', '__init__.py')
        
        # Read the file content
        with open(provider_init_path, 'r') as f:
            content = f.read()
        
        # Fix the syntax error on line 48
        fixed_content = content.replace(
            'f"Could not load custom provider class {', 
            'f"Could not load custom provider class {provider_class_path}: {str(e)}"'
        )
        
        # Write the fixed content back
        with open(provider_init_path, 'w') as f:
            f.write(fixed_content)
        
        print("Successfully patched fastapi_payments provider module")
        
    except Exception as e:
        print(f"Error patching fastapi_payments: {str(e)}")

if __name__ == "__main__":
    fix_provider_init()