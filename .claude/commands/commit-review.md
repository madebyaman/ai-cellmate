---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git reset:*), Bash(git add:*), Bash(git diff:*), Bash(git branch:*), Bash(git log:*)
description: Review the changes and create a commit
---

## Resetting staged

`!git reset HEAD .`

## Context

- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits: !`git log --oneline -10`

## Your task

1. Review changes
  * Use git diff to inspect all modified files.
  * Understand the scope and nature of each change.

2. Plan commits
  * Group related changes together into logical, holistic commits.
  * Avoid separating a new library addition from the code that uses it.

3. Stage changes
  * Stage only files that are ready to commit.

4. Documentation check
  * Compare staged files with project documentation.
  * Identify if any documentation updates are needed to match code changes.
  * If updates are needed, make them and stage the updated documentation.

## Commit guidelines

* Aim for no more than 3 commits unless more is clearly justified.
* Each commit should be self-contained and meaningful.
* Write a clear commit message:
  * First line: short and descriptive.
  * Body: bullet-point summary of changes.
* Do not commit binaries or large files (>1MB).
* If such files are detected, stop the process and ask for a decision before proceeding.
