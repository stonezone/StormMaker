# StormMaker - Current Action Plan
**Generated**: November 13, 2025
**Status**: Draft - Needs Vibe Check

## Context
This plan addresses issues identified in `stormmaker_code_review_TODO.md` and additional findings from codebase inspection. Issues are prioritized by impact and ease of implementation.

---

## Phase 1: Critical Repository Hygiene (IMMEDIATE)
**Priority**: P0 - Must Fix Before Further Development
**Estimated Time**: 30 minutes

### 1.1 Create .gitignore File
- **Issue**: No .gitignore exists; node_modules/ and dist/ are in git
- **Impact**: Bloated repo, slow clones, inconsistent builds
- **Action**:
  ```gitignore
  # Dependencies
  node_modules/

  # Build output
  dist/

  # Environment
  .env
  .env.local

  # OS files
  .DS_Store
  .DS_Store?
  ._*
  .Spotlight-V100
  .Trashes

  # Editor
  .vscode/
  .idea/
  *.swp
  *.swo
  *~

  # Misc
  database.sqlite
  *.log
  ```
- **Validation**: Confirmed node_modules/ and dist/ are present
- **Status**: TODO

### 1.2 Remove node_modules/ and dist/ from Git
- **Issue**: These directories are currently tracked
- **Impact**: 49+ files in node_modules bloating repository
- **Action**:
  ```bash
  git rm -r --cached node_modules/
  git rm -r --cached dist/
  git add .gitignore
  git commit -m "Add .gitignore and remove build artifacts from version control"
  ```
- **Validation**: Confirmed via `ls -la`
- **Status**: TODO

### 1.3 Clean Up Root Directory
- **Issue**: Multiple loose documentation files in root
- **Files to Review**:
  - `complete_file_manifest.json` - likely generated, should be gitignored
  - `database.sqlite` - empty file, should be gitignored
  - `dependency_inventory.json` - likely generated
  - `domain_model.md` - move to docs/
  - `feature_inventory.md` - move to docs/
  - `inferred_project_goals.md` - move to docs/
  - `phase1_thinking.md` - move to docs/
  - `PROJECT_INTENT.md` - move to docs/
  - `stormmaker_code_review_TODO.md` - archive or integrate into this plan
- **Action**: Organize documentation into docs/ folder
- **Status**: TODO

---

## Phase 2: Legal & Licensing (HIGH PRIORITY)
**Priority**: P1 - Required for Public Repository
**Estimated Time**: 15 minutes

### 2.1 Add LICENSE File
- **Issue**: No LICENSE file exists
- **Impact**: Legally unclear rights for users/contributors
- **Recommendation**: MIT License (permissive, educational-friendly)
- **Action**:
  1. Create LICENSE file at root
  2. Add license field to package.json
  3. Update README with license badge
- **Validation**: Confirmed via `test -f LICENSE`
- **Status**: TODO

---

## Phase 3: Dependency Updates (MEDIUM PRIORITY)
**Priority**: P2 - Important but Non-Blocking
**Estimated Time**: 45 minutes

### 3.1 Update Vitest to v4.0.8
- **Issue**: Using Vitest 3.2.4, current is 4.0.8 (major version)
- **Impact**: Missing stable browser mode, visual regression testing
- **Action**:
  1. Review Vitest 4.0 migration guide
  2. Update package.json: `"vitest": "^4.0.8"`
  3. Run `npm update vitest`
  4. Run tests to verify compatibility
  5. Update .claude/CLAUDE.md to reflect new version
- **Risk**: Breaking changes in major version
- **Status**: TODO

### 3.2 Add Node.js Engine Requirement
- **Issue**: No explicit Node.js version requirement
- **Impact**: Vite 7 requires Node.js 20.19+
- **Action**: Add to package.json:
  ```json
  "engines": {
    "node": ">=20.19.0"
  }
  ```
- **Status**: TODO

---

## Phase 4: CI/CD Pipeline (MEDIUM PRIORITY)
**Priority**: P2 - Quality Assurance
**Estimated Time**: 45 minutes

### 4.1 Create GitHub Actions Workflow
- **Issue**: No automated testing or build verification
- **Impact**: Regressions not caught early
- **Action**: Create `.github/workflows/ci.yml`:
  ```yaml
  name: CI

  on:
    push:
      branches: [ master ]
    pull_request:
      branches: [ master ]

  jobs:
    build-and-test:
      runs-on: ubuntu-latest

      steps:
        - uses: actions/checkout@v4

        - uses: actions/setup-node@v4
          with:
            node-version: '22'
            cache: 'npm'

        - name: Install dependencies
          run: npm ci

        - name: Run tests
          run: npm test

        - name: Build
          run: npm run build

        - name: Upload build artifacts
          uses: actions/upload-artifact@v4
          if: success()
          with:
            name: build
            path: dist/
            retention-days: 7
  ```
- **Validation**: Confirmed no .github/ directory exists
- **Status**: TODO

---

## Phase 5: Documentation Improvements (LOWER PRIORITY)
**Priority**: P3 - Nice to Have
**Estimated Time**: 1 hour

### 5.1 Enhance README.md
- **Current Status**: Good quality (per code review)
- **Additions Needed**:
  - Tech stack bullet (Vanilla JS, Vite, Vitest, Canvas API)
  - Contributing section pointing to docs
  - License badge
  - CI status badge (after Phase 4)
- **Status**: TODO

### 5.2 Create CHANGELOG.md
- **Issue**: No changelog exists
- **Impact**: Hard to track version changes
- **Action**: Create CHANGELOG.md with current version (0.1.0) as baseline
- **Status**: TODO

### 5.3 Convert CODE_REVIEW.md to GitHub Issues
- **Issue**: Static document vs. actionable tracking
- **Action**: Create GitHub issues for outstanding items in CODE_REVIEW.md
- **Status**: TODO

---

## Phase 6: Testing Coverage (LOWER PRIORITY)
**Priority**: P3 - Improve Quality
**Estimated Time**: 3-4 hours

### 6.1 Increase Test Coverage
- **Current**: ~20% coverage (physics only)
- **Target**: 60%+ coverage
- **Areas to Test**:
  - State stores (stormStore, simClock, scenarioStore)
  - UI interactions (basic smoke tests)
  - Edge cases (0°/360° wrapping, land boundaries)
- **Status**: TODO

### 6.2 Add E2E Tests
- **Tool**: Consider Playwright for browser-based testing
- **Tests Needed**:
  - App loads successfully
  - Storm can be added and dragged
  - Spots show energy updates
  - Scenarios load correctly
- **Status**: TODO

---

## Phase 7: Code Quality Improvements (LOWER PRIORITY)
**Priority**: P4 - Future Enhancement
**Estimated Time**: Variable

### 7.1 AppleScript Launcher Audit
- **Items to Verify** (from code review):
  - Robust PID handling
  - Port collision detection
  - Error surfacing via dialogs
  - Shell environment compatibility
- **Status**: DEFERRED

### 7.2 Architecture Review
- **Items to Audit**:
  - State management centralization
  - Separation of concerns (physics/render/UI)
  - Performance optimization opportunities
- **Status**: DEFERRED

### 7.3 Accessibility Audit
- **Items to Check**:
  - Keyboard navigation completeness
  - ARIA labels for controls
  - Color contrast on canvas
  - Screen reader compatibility
- **Status**: DEFERRED

---

## Vibe Check Results

### ✅ Strengths of This Plan:
1. **Prioritization**: Tackles critical repo hygiene first
2. **Incremental**: Each phase can be completed independently
3. **Validated**: All P0-P2 issues confirmed via codebase inspection
4. **Actionable**: Specific commands and code snippets provided
5. **Time-Boxed**: Realistic estimates for each phase

### ⚠️ Concerns to Address:
1. **Vitest Update Risk**: Major version upgrade could break tests
   - **Mitigation**: Run tests immediately after update, have rollback plan
2. **Documentation Sprawl**: Too many loose docs in root
   - **Mitigation**: Organize into docs/ as part of Phase 1
3. **Scope Creep**: Phase 7 is very broad
   - **Mitigation**: Clearly marked as DEFERRED, not blocking

### 🎯 Recommended Execution Order:
1. **Phase 1 (Critical)** - Do immediately, blocks everything else
2. **Phase 2 (Legal)** - Do before next commit/push to public repo
3. **Phase 4 (CI/CD)** - Do before Phase 3 to catch any breaking changes
4. **Phase 3 (Dependencies)** - Do after CI is in place
5. **Phase 5-7** - As time permits

---

## Success Criteria
- [ ] No build artifacts in git (node_modules/, dist/)
- [ ] .gitignore properly configured
- [ ] LICENSE file present and referenced in package.json
- [ ] CI pipeline passing on all commits
- [ ] Vitest updated to 4.0.8 with all tests passing
- [ ] Node.js version requirement documented
- [ ] Documentation organized in docs/ folder

---

## Rollback Plan
If any phase fails:
1. **Phase 1**: Can be safely committed separately
2. **Phase 2**: No code changes, only adds files
3. **Phase 3**: Keep Vitest 3.2.4 if tests fail, revert package.json
4. **Phase 4**: CI failures don't block local development
5. **Phase 5-7**: Optional enhancements, no risk

---

## Next Steps
1. Review this plan
2. Get approval for execution order
3. Create git branch for Phase 1-2 work
4. Execute phases sequentially
5. Test thoroughly between phases

**Total Estimated Time for P0-P2**: ~2.5 hours
**Total Estimated Time for All Phases**: ~6-8 hours