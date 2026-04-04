# Test fixture: Clean Python — zero violations expected

from typing import Optional
import subprocess


def safe_function(data: str) -> Optional[str]:
    try:
        result = subprocess.run(["echo", data], capture_output=True, text=True)
        return result.stdout.strip()
    except FileNotFoundError:
        return None
