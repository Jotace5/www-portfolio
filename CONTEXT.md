# jotace.io

A personal portfolio. This glossary covers the Projects section: the codebases it features and
the two kinds of information shown about each.

## Language

### Projects

**Project**:
A codebase featured in the Projects section, with its info panel and graph.
_Avoid_: Repo, repository (a project need not have a public repository)

**Project name**:
The key that identifies a project everywhere it appears: in the config, in the pipeline, and on
the site.
_Avoid_: repoName, slug, repo

**Display name**:
The human-readable title of a project, shown in the selector and the info panel.
_Avoid_: Title, label

### What is known about a project

**Editorial content**:
What is written by hand about a project: its display name, description, techs, links and demo.
_Avoid_: Metadata (the word GitHub's API used for its own fields), GitHub data

**Measured data**:
What the pipeline derives from a project's code: file and line counts, modules, dependencies, and
the commit that was analysed.
_Avoid_: Stats, GitHub data, metadata

**Techs**:
The hand-picked labels naming a project's stack. Editorial content, never a measurement.
_Avoid_: Topics, languages (a language breakdown would be measured data)

**Demo**:
A playable build of a project, opened from its info panel on a page of its own.
_Avoid_: Preview, prototype (the prototype is the source a demo is made from)
