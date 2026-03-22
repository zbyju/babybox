/**
 * All user-facing messages in Czech.
 * Organized by module/feature.
 */

export const Messages = {
  // Startup messages
  startup: {
    starting: "Spoustim Babybox startup aplikaci...",
    completed: "Startup uspesne dokoncen.",
    failed: "Startup selhal.",
    alreadyRunning: "Aplikace jiz bezi.",
  },

  // Update messages
  update: {
    checking: "Kontroluji aktualizace...",
    pulling: "Stahuji nove zmeny z repozitare...",
    upToDate: "Aplikace je aktualni.",
    updated: (commits: number) => `Stazeno ${commits} novych commitu.`,
    networkError: "Nelze se pripojit k repozitari. Zkontrolujte pripojeni k internetu.",
    conflictDetected: "Detekovany konflikty pri aktualizaci.",
    stashingChanges: "Ukladam lokalni zmeny do stashe...",
    stashSuccess: "Lokalni zmeny ulozeny.",
    stashFailed: "Nelze ulozit lokalni zmeny.",
    proceedingWithoutChanges: "Pokracuji bez lokalnich zmen.",
  },

  // Build messages
  build: {
    starting: "Spoustim build aplikace...",
    installingDeps: "Instaluji zavislosti...",
    compiling: "Kompiluji zdrojove kody...",
    success: (durationMs: number) => `Build uspesne dokoncen za ${Math.round(durationMs / 1000)}s.`,
    failed: "Build selhal.",
    depsFailed: "Instalace zavislosti selhala.",
  },

  // Override/deployment messages
  override: {
    starting: "Nasazuji novou verzi...",
    backingUp: "Vytvarim zalohu aktualni verze...",
    copying: "Kopiruji nove soubory...",
    success: "Nova verze uspesne nasazena.",
    failed: "Nasazeni selhalo.",
    rollingBack: "Provadim rollback na predchozi verzi...",
    rollbackSuccess: "Rollback uspesny, pouziva se predchozi verze.",
    rollbackFailed: "Rollback selhal! Aplikace muze byt v nekonzistentnim stavu.",
  },

  // Process messages
  process: {
    starting: (name: string) => `Spoustim sluzbu ${name}...`,
    started: (name: string) => `Sluzba ${name} uspesne spustena.`,
    stopping: (name: string) => `Zastavuji sluzbu ${name}...`,
    stopped: (name: string) => `Sluzba ${name} zastavena.`,
    failed: (name: string) => `Spusteni sluzby ${name} selhalo.`,
    retrying: (name: string, attempt: number) => `Pokus o spusteni ${name} (#${attempt})...`,
    alreadyRunning: (name: string) => `Sluzba ${name} jiz bezi.`,
  },

  // Install messages
  install: {
    starting: "Spoustim instalaci...",
    checkingPrerequisites: "Kontroluji pozadavky...",
    prerequisiteMissing: (name: string) => `Chybi pozadovana zavislost: ${name}`,
    installing: (name: string) => `Instaluji ${name}...`,
    success: "Instalace uspesne dokoncena.",
    failed: "Instalace selhala.",
  },

  // Suggestion messages
  suggestions: {
    checkNetwork: "Zkontrolujte pripojeni k internetu a zkuste to znovu.",
    checkDiskSpace: "Zkontrolujte volne misto na disku.",
    restartMachine: "Restartujte pocitac a zkuste to znovu.",
    contactSupport: "Kontaktujte technickou podporu.",
    runCommand: (cmd: string) => `Spustte nasledujici prikaz: ${cmd}`,
    checkPermissions: (path: string) => `Zkontrolujte opravneni k ${path}.`,
    stashChanges: "Ulozte lokalni zmeny pouzitim 'git stash'.",
    discardChanges: "Zahodte lokalni zmeny pouzitim 'git checkout -- .'",
    manualPull: "Zkuste rucne stahnout zmeny pouzitim 'git pull'.",
  },

  // General
  general: {
    error: "Chyba",
    warning: "Varovani",
    success: "Uspech",
    duration: (ms: number) => `Doba trvani: ${Math.round(ms / 1000)}s`,
  },
} as const;
