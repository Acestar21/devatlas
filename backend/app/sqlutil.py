def escape_like(value: str) -> str:
    """Pattern for a case-insensitive 'contains' search with % _ and \\ escaped, so users can't inject
    wildcards. Use as: column.ilike(escape_like(text), escape="\\\\")."""
    escaped = value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"