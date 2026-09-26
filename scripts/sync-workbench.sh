#!/bin/bash
# Cursor hook entry. User hooks run from ~/.cursor/.
exec python3 "$HOME/Projects/software-engineering-workbench/scripts/sync-workbench.py"
