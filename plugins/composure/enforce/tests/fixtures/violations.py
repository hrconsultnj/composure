# Test fixture: Python violations

import os

def bad_function(data: Any) -> None:  # type: ignore
    try:
        os.system("rm -rf /tmp/test")
        eval("print('hello')")
        result = process()
    except:
        pass
    except Exception:
        pass
    x = 1  # noqa
