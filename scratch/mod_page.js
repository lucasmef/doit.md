import fs from 'fs'

const file = 'apps/web/src/app/(app)/notas/page.tsx'
let content = fs.readFileSync(file, 'utf8')

// Chunk 1: Remove sidebar buttons
const sidebarButtons = `      <div className="space-y-2 border-t border-navy-900/[0.07] p-3">
        <button
          type="button"
          onClick={handleNewFolder}
          className="min-h-[42px] w-full rounded-[15px] bg-[linear-gradient(135deg,#2F6BFF,#7B5BFF)] font-extrabold text-white"
        >
          Nova pasta
        </button>
        <button
          type="button"
          onClick={() => selectedId && setAgentsForId(selectedId)}
          disabled={!selectedId}
          className="min-h-[42px] w-full rounded-[15px] bg-navy-900/[0.055] font-extrabold text-navy-900 disabled:opacity-40"
        >
          Editar AGENTS.md
        </button>
      </div>`
content = content.replace(sidebarButtons, '')

// Chunk 2: Add Nova pasta to kebab menu
const subfolderButton = `                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { handleNewSubfolder(); setHeaderMenuOpen(false) }}
                            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-[12px] px-3 text-left text-[13px] font-semibold text-navy-900 hover:bg-navy-900/[0.045]"
                          >
                            <FolderGlyph className="h-4 w-4 text-brand-600" />
                            Nova subpasta
                          </button>`

const newMenuButtons = `                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { handleNewFolder(); setHeaderMenuOpen(false) }}
                            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-[12px] px-3 text-left text-[13px] font-semibold text-navy-900 hover:bg-navy-900/[0.045]"
                          >
                            <FolderGlyph className="h-4 w-4 text-brand-600" />
                            Nova pasta
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { handleNewSubfolder(); setHeaderMenuOpen(false) }}
                            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-[12px] px-3 text-left text-[13px] font-semibold text-navy-900 hover:bg-navy-900/[0.045]"
                          >
                            <FolderGlyph className="h-4 w-4 text-brand-600 opacity-60" />
                            Nova subpasta
                          </button>`

content = content.replace(subfolderButton, newMenuButtons)

// Chunk 3: Update Header View (ID 025 + 058)
const headerStart = `                <div className="mt-2.5 flex flex-wrap items-start justify-between gap-3">
                  <h1 className="text-[34px] font-black leading-none -tracking-[.05em] text-navy-900 lg:text-[42px]">
                    {selectedFolder.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* ID 025: no topo fica só a ação primária "Novo item"; o resto vai para o menu kebab. */}
                    <button
                      type="button"
                      onClick={() => handleNewItem(selectedId)}
                      className="hidden h-[38px] items-center rounded-full bg-[linear-gradient(135deg,#2F6BFF,#7B5BFF)] px-3.5 text-[13px] font-extrabold text-white lg:inline-flex"
                    >
                      Novo item
                    </button>

                    {/* Mobile & Desktop: ações agrupadas em menu kebab (ID 016/025). */}`

const newHeaderStart = `                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-[28px] font-black leading-none -tracking-[.05em] text-navy-900 lg:text-[28px]">
                      {selectedFolder.name}
                    </h1>

                    {/* Desktop View/Sort toggles (ID 058) */}
                    <div className="hidden lg:flex items-center gap-2">
                      <div className="inline-flex gap-1 rounded-full bg-navy-900/[0.055] p-1">
                        {(['kanban', 'list'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => void changeView(mode)}
                            className={\`inline-flex h-8 items-center rounded-full px-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] \${
                              viewMode === mode ? 'bg-white text-brand-600 shadow-cool-sm' : 'text-navy-500'
                            }\`}
                          >
                            {mode === 'kanban' ? 'Kanban' : 'Lista'}
                          </button>
                        ))}
                      </div>
                      <div className="relative" ref={sortRef}>
                        <button
                          type="button"
                          onClick={() => setSortOpen((v) => !v)}
                          className="inline-flex h-8 items-center gap-2 rounded-full border border-white/72 bg-white/68 px-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] text-navy-500"
                          aria-haspopup="menu"
                          aria-expanded={sortOpen}
                        >
                          Ordenar: {activeSort.label} ▾
                        </button>
                        {sortOpen ? (
                          <div className="absolute left-0 top-10 z-20 w-56 rounded-[20px] border border-white/78 bg-white/92 p-2 shadow-cool-md backdrop-blur-2xl" role="menu">
                            {SORT_OPTIONS.map((option) => (
                              <button
                                key={option.key}
                                type="button"
                                role="menuitemradio"
                                aria-checked={option.key === sortKey}
                                onClick={() => {
                                  setSortKey(option.key)
                                  setSortOpen(false)
                                }}
                                className={\`flex min-h-[36px] w-full items-center justify-between gap-3 rounded-[13px] px-2.5 text-[12px] font-semibold \${
                                  option.key === sortKey ? 'bg-brand-500/[0.08] text-brand-600' : 'text-navy-900 hover:bg-navy-900/[0.045]'
                                }\`}
                              >
                                <span>{option.label}</span>
                                <span className="font-mono text-[10px] text-navy-500">{option.hint}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Mobile & Desktop: ações agrupadas em menu kebab (ID 016/025). */}`

content = content.replace(headerStart, newHeaderStart)

// Now we need to remove the old view/sort container (or keep it only for mobile)
const oldViewSortStart = `                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <div className="inline-flex gap-1 rounded-full bg-navy-900/[0.055] p-1">
                    {(['kanban', 'list'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => void changeView(mode)}
                        className={\`inline-flex h-8 items-center rounded-full px-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] \${
                          viewMode === mode ? 'bg-white text-brand-600 shadow-cool-sm' : 'text-navy-500'
                        }\`}
                      >
                        {mode === 'kanban' ? 'Kanban' : 'Lista'}
                      </button>
                    ))}
                  </div>
                  <span className="hidden h-8 items-center rounded-full border border-white/68 bg-white/62 px-2.5 font-mono text-[10px] text-navy-500 lg:inline-flex">
                    {allFolderItems.length} {allFolderItems.length === 1 ? 'item' : 'itens'}
                  </span>
                  <span className="hidden h-8 items-center rounded-full border border-white/68 bg-white/62 px-2.5 font-mono text-[10px] text-navy-500 lg:inline-flex">
                    {childFolders.length} {childFolders.length === 1 ? 'subpasta' : 'subpastas'}
                  </span>
                  <div className="relative" ref={sortRef}>
                    <button
                      type="button"
                      onClick={() => setSortOpen((v) => !v)}
                      className="inline-flex h-8 items-center gap-2 rounded-full border border-white/72 bg-white/68 px-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] text-navy-500"
                      aria-haspopup="menu"
                      aria-expanded={sortOpen}
                    >
                      Ordenar: {activeSort.label} ▾
                    </button>
                    {sortOpen ? (
                      <div className="absolute right-0 top-10 z-20 w-56 rounded-[20px] border border-white/78 bg-white/92 p-2 shadow-cool-md backdrop-blur-2xl" role="menu">
                        {SORT_OPTIONS.map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            role="menuitemradio"
                            aria-checked={option.key === sortKey}
                            onClick={() => {
                              setSortKey(option.key)
                              setSortOpen(false)
                            }}
                            className={\`flex min-h-[36px] w-full items-center justify-between gap-3 rounded-[13px] px-2.5 text-[12px] font-semibold \${
                              option.key === sortKey ? 'bg-brand-500/[0.08] text-brand-600' : 'text-navy-900 hover:bg-navy-900/[0.045]'
                            }\`}
                          >
                            <span>{option.label}</span>
                            <span className="font-mono text-[10px] text-navy-500">{option.hint}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>`

const newMobileViewSort = `                {/* Mobile View/Sort toggles */}
                <div className="mt-4 flex flex-wrap items-center gap-2.5 lg:hidden">
                  <div className="inline-flex gap-1 rounded-full bg-navy-900/[0.055] p-1">
                    {(['kanban', 'list'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => void changeView(mode)}
                        className={\`inline-flex h-8 items-center rounded-full px-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] \${
                          viewMode === mode ? 'bg-white text-brand-600 shadow-cool-sm' : 'text-navy-500'
                        }\`}
                      >
                        {mode === 'kanban' ? 'Kanban' : 'Lista'}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSortOpen((v) => !v)}
                      className="inline-flex h-8 items-center gap-2 rounded-full border border-white/72 bg-white/68 px-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] text-navy-500"
                      aria-haspopup="menu"
                      aria-expanded={sortOpen}
                    >
                      Ordenar: {activeSort.label} ▾
                    </button>
                    {sortOpen ? (
                      <div className="absolute right-0 top-10 z-20 w-56 rounded-[20px] border border-white/78 bg-white/92 p-2 shadow-cool-md backdrop-blur-2xl" role="menu">
                        {SORT_OPTIONS.map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            role="menuitemradio"
                            aria-checked={option.key === sortKey}
                            onClick={() => {
                              setSortKey(option.key)
                              setSortOpen(false)
                            }}
                            className={\`flex min-h-[36px] w-full items-center justify-between gap-3 rounded-[13px] px-2.5 text-[12px] font-semibold \${
                              option.key === sortKey ? 'bg-brand-500/[0.08] text-brand-600' : 'text-navy-900 hover:bg-navy-900/[0.045]'
                            }\`}
                          >
                            <span>{option.label}</span>
                            <span className="font-mono text-[10px] text-navy-500">{option.hint}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>`

content = content.replace(oldViewSortStart, newMobileViewSort)

fs.writeFileSync(file, content, 'utf8')
console.log('Modifications completed.')
