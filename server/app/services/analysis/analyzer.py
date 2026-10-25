"""Turn fetched repo files into an AnalyzeResponse (everything except the AI overview and RAG index)."""

from app.schemas.repo import AnalyzeResponse, FileInfo, RepoMeta
from app.services.analysis.classify import classify_file
from app.services.analysis.detect import detect_dependencies, detect_frameworks
from app.services.analysis.graph import build_graph
from app.services.analysis.important import mark_important
from app.services.analysis.languages import language_of, language_stats
from app.services.analysis.tree import build_tree


def analyze(meta: RepoMeta, files: dict[str, str]) -> AnalyzeResponse:
    dependencies = detect_dependencies(files)
    frameworks = detect_frameworks(files, dependencies)
    important = mark_important(list(files))

    infos = [
        FileInfo(
            path=path,
            size=len(content.encode("utf-8")),
            language=language_of(path),
            category=classify_file(path, frameworks),
            important=path in important,
            reason=important.get(path),
        )
        for path, content in files.items()
    ]
    # important files first, then alphabetical: handy for "start here" lists
    infos.sort(key=lambda f: (not f.important, f.path))

    return AnalyzeResponse(
        repo_id=f"{meta.owner}/{meta.repo}",
        meta=meta,
        tree=build_tree(list(files)),
        languages=language_stats(files),
        frameworks=frameworks,
        dependencies=dependencies,
        files=infos,
        graph=build_graph(files, infos),
        index_status="pending",
    )
