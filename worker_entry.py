"""PyInstaller entry point: bundles the worker into a standalone binary."""

from services.worker.__main__ import main

if __name__ == "__main__":
    main()
