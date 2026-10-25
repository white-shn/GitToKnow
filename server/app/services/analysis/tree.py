from app.schemas.repo import TreeNode


def build_tree(paths: list[str]) -> list[TreeNode]:
    """Nested folder/file tree from flat file paths. Folders first, then files, each sorted by name."""
    root: dict = {}
    for path in paths:
        node = root
        for part in path.split("/"):
            node = node.setdefault(part, {})

    def build(level: dict, prefix: str) -> list[TreeNode]:
        ordered = sorted(level.items(), key=lambda kv: (not kv[1], kv[0].lower()))
        nodes = []
        for name, children in ordered:
            path = f"{prefix}{name}"
            if children:
                nodes.append(TreeNode(name=name, path=path, type="dir", children=build(children, path + "/")))
            else:
                nodes.append(TreeNode(name=name, path=path, type="file"))
        return nodes

    return build(root, "")
