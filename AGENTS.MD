## MEMPALACE_SEARCH (MCP Memory)

- What it does: Searches files, code, and memory using short keywords.
- Usage condition: When you need to inspect files, "rg" command MUST NOT be the first choice. You must first use "mempalace_search" with short keyword queries, then produce the response.
- Query rule: All mempalace_search queries MUST be written in English and must not exceed 3–4 words.

### Wing Handling Rule (IMPORTANT)

- Before running mempalace_search, you MUST call mempalace_list_wings.
- From the returned wing list:
  - Select the EXACT wing name that matches the current project context.
  - Use that exact wing name in mempalace_search queries.
- If wing-based search fails or returns an error:
  - Retry mempalace_search WITHOUT any wing filter (wingless search).
  - Continue with fallback results.
