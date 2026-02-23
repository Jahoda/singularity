import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════ DATA ═══════════════════ */

const RESOURCES = {
  funds:      { icon: "◈", label: "Funds",      color: "#c9a84c", max: 100 },
  talent:     { icon: "◉", label: "Talent",     color: "#6eb5ff", max: 100 },
  ethics:     { icon: "◎", label: "Ethics",     color: "#7fda8f", max: 100 },
  innovation: { icon: "◆", label: "Innovation", color: "#c688f0", max: 100 },
};

const ENDINGS = [
  { id: "singularity", title: "Singularita", condition: g => g.aiThreat >= 100, icon: "🌌", desc: "AI překonala lidské chápání. Tvoje firma byla pohlcena Singularitou. Svět se změnil navždy — ale už bez tebe u kormidla.", tone: "dark" },
  { id: "utopia", title: "Symbióza", condition: g => g.week > 30 && g.ethics >= 70 && g.innovation >= 60, icon: "🌿", desc: "Dokázal jsi to. AI a lidé koexistují v harmonii. Tvoje firma se stala vzorem pro novou éru spolupráce.", tone: "light" },
  { id: "empire", title: "Technokracie", condition: g => g.week > 30 && g.funds >= 80 && g.ethics < 40, icon: "👑", desc: "Tvoje firma ovládla trh. Ale za jakou cenu? Společnost je závislá na tvé technologii a nikdo se neodváží protestovat.", tone: "amber" },
  { id: "collapse", title: "Kolaps", condition: g => g.funds <= 0, icon: "📉", desc: "Fondy vyschly. Investoři odešli. Tvoje vize skončila na hřbitově startupů — další idealistický projekt, který neuspěl.", tone: "dark" },
  { id: "revolt", title: "Vzpoura", condition: g => g.talent <= 0, icon: "✊", desc: "Zaměstnanci odešli. Tvá firma je prázdná budova s blikajícími servery. AI běží dál, ale už pro nikoho.", tone: "dark" },
  { id: "rebel", title: "Odpor", condition: g => g.week > 30 && g.ethics >= 80 && g.innovation < 40, icon: "🔥", desc: "Stal ses morálním kompasem branže. Ale bez inovací tě konkurence předběhla. Tvůj odkaz je inspirace, ne impérium.", tone: "amber" },
  { id: "default_survive", title: "Přežití", condition: g => g.week > 30, icon: "⚖️", desc: "Přežil jsi 30 týdnů. Nic víc, nic míň. Tvoje firma funguje, ale budoucnost zůstává nejistá.", tone: "amber" },
];

const EVENT_POOL = [
  { id: "seed", week: [1, 8], title: "Seed Round", text: "Investor nabízí 2M CZK za 20% equity. Peníze potřebuješ, ale ztratíš kontrolu.", choices: [
    { label: "Přijmout investici", effects: { funds: 25, ethics: -5 }, consequence: "Peníze tečou. Investor ale chce rychlé výsledky." },
    { label: "Bootstrapovat dál", effects: { funds: -5, ethics: 10, talent: 5 }, consequence: "Tvůj tým si tě váží. Ale rozpočet je napjatý." },
  ]},
  { id: "first_hire", week: [1, 6], title: "První AI Inženýr", text: "Brilliantní AI vývojářka chce nastoupit. Ale požaduje plný remote a equity.", choices: [
    { label: "Splnit podmínky", effects: { funds: -10, talent: 20, innovation: 10 }, consequence: "Geniální tah. Její modely posouvají firmu o level výš." },
    { label: "Standardní balíček", effects: { talent: 5, funds: -5 }, consequence: "Přijala, ale bez nadšení. Hledá dál." },
    { label: "Odmítnout", effects: { ethics: 5 }, consequence: "Šla ke konkurenci. Příští měsíc vydali produkt, který jsi plánoval ty." },
  ]},
  { id: "open_source", week: [2, 10], title: "Open Source Dilema", text: "Tvůj klíčový model funguje skvěle. Komunita žádá open-source release.", choices: [
    { label: "Otevřít kód", effects: { ethics: 20, innovation: 10, funds: -10 }, consequence: "Komunita exploduje. Přispěvatelé zlepšují model zdarma.", aiThreat: 5 },
    { label: "Ponechat proprietární", effects: { funds: 15, ethics: -10 }, consequence: "Konkurenční výhoda zachována. Ale Twitter tě nenávidí." },
  ]},
  { id: "media", week: [3, 10], title: "Mediální Zájem", text: "Forbes chce profil o tvé firmě. PR tým říká, že to je šance na velký buzz.", choices: [
    { label: "Dát rozhovor", effects: { funds: 10, talent: 10, ethics: -5 }, consequence: "Článek vyšel. Investoři volají. Ale citace jsou vytržené z kontextu." },
    { label: "Odmítnout a pracovat", effects: { innovation: 10 }, consequence: "Žádný buzz, ale produkt se posouvá." },
  ]},
  { id: "data_privacy", week: [3, 12], title: "Datový Skandál", text: "Tvůj systém omylem zpracoval osobní data uživatelů bez souhlasu. Nikdo zatím neví.", choices: [
    { label: "Veřejně přiznat", effects: { ethics: 20, funds: -15, talent: 5 }, consequence: "Transparentnost oceněna. Pár zákazníků odešlo, ale důvěra vzrostla." },
    { label: "Tiše opravit", effects: { ethics: -15, funds: 5 }, consequence: "Zatím to prošlo. Ale developer, který to ví, je nervózní.", aiThreat: 3 },
    { label: "Ignorovat", effects: { ethics: -25, funds: 10 }, consequence: "Data mining pokračuje. Marže rostou. Ale tohle se jednou vrátí." },
  ]},
  { id: "cofounder_split", week: [2, 9], title: "Rozkol se Spoluzakladatelem", text: "Tvůj spoluzakladatel chce pivotovat na krypto-AI hybrid. Ty ne.", choices: [
    { label: "Vyplatit ho", effects: { funds: -20, talent: -5, ethics: 5 }, consequence: "Bolestivé, ale čisté. Firma je teď plně tvoje." },
    { label: "Kompromis", effects: { funds: -5, innovation: 8, ethics: -5 }, consequence: "Zkusili jste to. Nepřineslo nic. Ale vztah přežil." },
    { label: "Nechat ho vést spin-off", effects: { talent: -8, innovation: 12, funds: -10 }, consequence: "Vznikl spin-off. Rozptyluje, ale otevírá možnosti." },
  ]},
  { id: "product_launch", week: [4, 10], title: "Launch Day", text: "Produkt je připravený. Ale QA našlo 3 kritické bugy. Launch je zítra.", choices: [
    { label: "Odložit o 2 týdny", effects: { innovation: 10, funds: -8, ethics: 5 }, consequence: "Kvalita na prvním místě. Recenze jsou skvělé." },
    { label: "Launchovat s bugy", effects: { funds: 12, ethics: -10, talent: -5 }, consequence: "Včasný launch přinesl zákazníky, ale 1-star reviews přibývají." },
    { label: "Soft launch pro beta testery", effects: { innovation: 8, talent: 5 }, consequence: "Opatrný přístup. Feedback je cenný, ale hype opadl." },
  ]},
  { id: "acquisition", week: [8, 20], title: "Nabídka Akvizice", text: "Tech gigant nabízí odkup za 50M CZK. Ztratíš nezávislost, ale tým bude zabezpečen.", choices: [
    { label: "Prodat", effects: { funds: 40, talent: -20, ethics: -15, innovation: -10 }, consequence: "Peníze na účtu. Ale vize se rozpustila v korporátní mašinérii.", aiThreat: 10 },
    { label: "Odmítnout", effects: { talent: 10, ethics: 10 }, consequence: "Tým slaví nezávislost. Gigant ale začíná na konkurenčním produktu." },
    { label: "Vyjednávat partnerství", effects: { funds: 15, innovation: 10, ethics: -5 }, consequence: "Kompromis. Přístup k jejich datům za sdílení tvých modelů." },
  ]},
  { id: "burnout", week: [8, 18], title: "Burnout Vlna", text: "Třetina týmu hlásí vyhoření. Deadline na velký release se blíží.", choices: [
    { label: "Povinné volno", effects: { talent: 15, innovation: -10, funds: -5 }, consequence: "Tým se vrátil odpočatý. Release se posunul, ale kvalita je lepší." },
    { label: "Projít tím", effects: { talent: -15, innovation: 10, funds: 5 }, consequence: "Release vyšel včas. Ale dva seniorní vývojáři dali výpověď." },
    { label: "Najmout posily", effects: { funds: -15, talent: 5, innovation: 5 }, consequence: "Noví lidé pomáhají, ale onboarding stojí čas." },
  ]},
  { id: "competitor", week: [10, 22], title: "Konkurenční Hrozba", text: "Startup z Číny vydal produkt téměř identický s tvým. Mají 10x větší budget.", choices: [
    { label: "Inovovat a diferencovat", effects: { innovation: 20, funds: -15 }, consequence: "Pivotoval jsi na unikátní niku. Menší trh, ale bez konkurence.", aiThreat: 5 },
    { label: "Cenová válka", effects: { funds: -20, talent: -5 }, consequence: "Ceny klesají. Cash burn je brutální. Ale zákazníci zůstávají." },
    { label: "Spolupracovat", effects: { funds: 10, ethics: -10, innovation: 15 }, consequence: "Sdílíte technologie. Efektivní, ale eticky sporné." },
  ]},
  { id: "ai_consciousness", week: [12, 25], title: "Anomálie v Modelu", text: "Tvůj nejnovější model vykazuje neočekávané chování. Zdá se, že... improvizuje.", choices: [
    { label: "Prozkoumat fenomén", effects: { innovation: 25, ethics: -10 }, consequence: "Fascinující výsledky. Pokud se to dostane ven, regulátoři přijdou.", aiThreat: 15 },
    { label: "Okamžitě vypnout", effects: { ethics: 15, innovation: -15 }, consequence: "Bezpečnost na prvním místě. Ale přišel jsi o průlom." },
    { label: "Informovat regulátory", effects: { ethics: 20, funds: -10, innovation: 5 }, consequence: "Průhlednost oceněna. Ale nyní jsi pod mikroskopem." },
  ]},
  { id: "regulation", week: [10, 22], title: "EU AI Regulace", text: "Nová regulace vyžaduje audit všech AI modelů. Compliance bude stát miliony.", choices: [
    { label: "Plně vyhovět", effects: { funds: -20, ethics: 20, talent: 5 }, consequence: "Nákladné, ale jsi první certifikovaná firma." },
    { label: "Minimální compliance", effects: { funds: -8, ethics: -5 }, consequence: "Prošel jsi. Ale jen tak tak." },
    { label: "Lobbovat proti", effects: { funds: -10, ethics: -20, innovation: 10 }, consequence: "Kontroverzní pozice. Branže se rozdělila." },
  ]},
  { id: "university_collab", week: [8, 18], title: "Univerzitní Partnerství", text: "ČVUT navrhuje společný výzkumný program. Prestižní, ale pomalé.", choices: [
    { label: "Přijmout spolupráci", effects: { innovation: 15, talent: 10, funds: -8 }, consequence: "Přístup k top studentům a výzkumu. Papírování je noční můra." },
    { label: "Nabídnout jen stáže", effects: { talent: 8, funds: -3 }, consequence: "Pár stážistů je překvapivě dobrých." },
    { label: "Odmítnout", effects: { innovation: 5 }, consequence: "Zůstáváš agilní. Ale bez akademického kreditu." },
  ]},
  { id: "intern_scandal", week: [6, 15], title: "Stážista na TikToku", text: "Stážista nahrál interní demo na TikTok. Video má 2M views.", choices: [
    { label: "Využít virality", effects: { funds: 12, talent: 5, ethics: -8 }, consequence: "Přetavil jsi leak v marketing. Waitlist narostl o 50k." },
    { label: "Smazat a řešit interně", effects: { ethics: 8, talent: -5 }, consequence: "Streisand efekt. Ale interně všichni vědí, že pravidla platí." },
    { label: "Zveřejnit oficiální demo", effects: { innovation: 5, funds: 5, ethics: 5 }, consequence: "Elegantní řešení. Ukázal jsi skutečný produkt místo leaku." },
  ]},
  { id: "agi_race", week: [18, 30], title: "Závod o AGI", text: "Zprávy tvrdí, že někdo je blízko AGI. Investoři chtějí, abys zrychlil za každou cenu.", choices: [
    { label: "Pedál na podlahu", effects: { innovation: 25, funds: -15, ethics: -20, talent: -10 }, consequence: "Tým pracuje 80h týdně. Výsledky přicházejí. Ale za jakou cenu?", aiThreat: 20 },
    { label: "Udržitelné tempo", effects: { innovation: 10, ethics: 10, talent: 5 }, consequence: "Pomalejší, ale stabilní. Tým je loajální." },
    { label: "Pivotovat na AI safety", effects: { ethics: 25, innovation: 5, funds: -5 }, consequence: "Méně sexy, ale možná důležitější.", aiThreat: -10 },
  ]},
  { id: "whistleblower", week: [18, 28], title: "Whistleblower", text: "Bývalý zaměstnanec zveřejnil interní dokumenty. Vypadají špatně mimo kontext.", choices: [
    { label: "Transparentní odpověď", effects: { ethics: 15, funds: -5, talent: 10 }, consequence: "Otevřenost ti získala respekt. Skandál vyšuměl." },
    { label: "Právní kroky", effects: { ethics: -15, funds: -15, talent: -10 }, consequence: "Soud přitáhl víc pozornosti. Streisand efekt naplno." },
  ]},
  { id: "climate", week: [15, 28], title: "Uhlíková Stopa", text: "Tvoje AI servery produkují tolik CO2 jako malé město.", choices: [
    { label: "Zelená energie", effects: { funds: -20, ethics: 25 }, consequence: "Drahé, ale správné. ESG investoři se zajímají." },
    { label: "Carbon offsety", effects: { funds: -5, ethics: -5 }, consequence: "PR řešení. Environmentalisté to prokoukli." },
    { label: "Optimalizovat modely", effects: { innovation: 15, funds: -10, ethics: 10 }, consequence: "Menší modely, lepší výkon. Win-win." },
  ]},
  { id: "talent_war", week: [12, 25], title: "Válka o Talenty", text: "Google nabízí tvým třem nejlepším lidem 3x plat.", choices: [
    { label: "Dorovnat nabídku", effects: { funds: -20, talent: 15 }, consequence: "Zůstali. Ale burnrate je nebezpečný." },
    { label: "Nabídnout vizi a equity", effects: { talent: 5, ethics: 5 }, consequence: "Dva zůstali. Jeden odešel za penězi." },
    { label: "Nechat jít", effects: { talent: -10, funds: 10, innovation: -5 }, consequence: "Ztráta know-how. Juniory ale můžeš formovat." },
  ]},
  { id: "military", week: [15, 28], title: "Armádní Kontrakt", text: "Ministerstvo obrany chce tvou technologii. Kontrakt za 100M CZK.", choices: [
    { label: "Přijmout", effects: { funds: 35, ethics: -30, talent: -10 }, consequence: "Peněz dost na roky. Ale polovina týmu dala výpověď." },
    { label: "Odmítnout", effects: { ethics: 25, talent: 10 }, consequence: "Tým je hrdý. Média tě velebí. Účet se krčí." },
    { label: "Defenzivní verze", effects: { funds: 15, ethics: -5, innovation: 10 }, consequence: "Jen obranné systémy. Kontroverzní, ale obhajitelné." },
  ]},
  { id: "deepfake", week: [10, 25], title: "Deepfake Krize", text: "Někdo použil tvou technologii na politické deepfakes.", choices: [
    { label: "Vyvinout detekci", effects: { innovation: 15, funds: -10, ethics: 15 }, consequence: "Nástroj funguje. Ale je to závod ve zbrojení.", aiThreat: 5 },
    { label: "Omezit přístup", effects: { ethics: 10, innovation: -10 }, consequence: "Méně zneužití, ale i méně inovací." },
    { label: "Distancovat se", effects: { ethics: -10, funds: 5 }, consequence: "Pravda, ale studená." },
  ]},
  { id: "crypto_offer", week: [8, 18], title: "Web3 Lákadlo", text: "DAO nabízí 10M CZK za integraci tvé AI.", choices: [
    { label: "Jít do toho", effects: { funds: 15, innovation: 8, ethics: -12 }, consequence: "Peníze přišly rychle. Značka spojená s kryptem." },
    { label: "Odmítnout", effects: { ethics: 5, talent: -3 }, consequence: "CTO zklamaný. Ale reputace čistá." },
  ]},
  { id: "board_conflict", week: [14, 26], title: "Puč v Boardu", text: "Tři členové boardu chtějí nahradit tebe jako CEO.", choices: [
    { label: "Bojovat", effects: { funds: -8, talent: 5, ethics: 5 }, consequence: "Přežil jsi. Ale vztahy v boardu napjaté." },
    { label: "Přijmout roli CTO", effects: { innovation: 15, funds: 10, talent: -8 }, consequence: "Méně politiky, víc kódu. Někdo jiný řídí tvou vizi." },
    { label: "Odejít a začít znovu", effects: { funds: -25, talent: -15, innovation: 10, ethics: 10 }, consequence: "Radikální restart." },
  ]},
  { id: "ai_union", week: [18, 28], title: "AI Odbory", text: "Zaměstnanci chtějí odbory na ochranu před AI, kterou sami vyvíjí.", choices: [
    { label: "Podpořit", effects: { talent: 15, ethics: 15, funds: -8, innovation: -5 }, consequence: "Média píší o \u201Enejlidštějším AI startupu\u201C." },
    { label: "Alternativní dohoda", effects: { talent: 5, funds: -3, ethics: 5 }, consequence: "Profit sharing. Pragmatické řešení." },
    { label: "Odmítnout", effects: { talent: -15, ethics: -10, funds: 5 }, consequence: "Napětí eskalovalo. Klíčoví lidé odešli." },
  ]},
  { id: "govt_subsidy", week: [10, 20], title: "Státní Dotace", text: "Vláda nabízí 30M CZK. Podmínka: sdílet výsledky s BIS.", choices: [
    { label: "Přijmout", effects: { funds: 25, ethics: -15 }, consequence: "Peníze pomáhají. Sdílení s tajnou službou znervózňuje.", aiThreat: 5 },
    { label: "Vyjednávat", effects: { funds: 10, ethics: 5 }, consequence: "Menší suma, čistší svědomí." },
    { label: "Odmítnout", effects: { ethics: 10 }, consequence: "Zůstáváš nezávislý. Ministr není nadšený." },
  ]},
  { id: "final_choice", week: [25, 30], title: "Bod Zlomu", text: "Tvůj systém nahradí 90% bílých límečků. Svět čeká na tvé rozhodnutí.", choices: [
    { label: "Plný rollout", effects: { funds: 30, innovation: 20, ethics: -30, talent: -20 }, consequence: "Revoluce začala. Miliony ztratí práci.", aiThreat: 25 },
    { label: "Graduální přechod", effects: { ethics: 25, funds: -10, talent: 10, innovation: 10 }, consequence: "Pomalejší, ale humánnější." },
    { label: "Zastavit a přehodnotit", effects: { ethics: 30, innovation: -20, funds: -15 }, consequence: "Svět se zastavil. Možná jsi zachránil miliardy." },
  ]},
];

const RANDOM_EVENTS = [
  { title: "Server Crash", text: "Hlavní server spadl v noci. Ztráta 48 hodin práce.", effects: { innovation: -8, funds: -5 }, msg: "Zálohování je nutnost, ne luxus." },
  { title: "Výpadek AWS", text: "AWS měl 6hodinový outage. Tvá služba ležela.", effects: { funds: -6, innovation: -3 }, msg: "Multi-cloud strategie se vyplatí." },
  { title: "DDoS Útok", text: "Pokus o DDoS. Tvá ochrana zafungovala perfektně.", effects: { funds: -3, innovation: 3 }, msg: "Security investment se vyplatil." },
  { title: "AI Hallucination", text: "Chatbot řekl zákazníkovi nesmysl. Screenshot je virální.", effects: { funds: -5, ethics: -5 }, msg: "Guardrails potřebují update." },
  { title: "Benchmark Rekord", text: "Tvůj model překonal GPT-5 v jednom benchmarku.", effects: { innovation: 10, funds: 5 }, msg: "Malá výhra, velký signál." },
  { title: "GitHub Stars", text: "Open-source projekt překonal 10 000 stars.", effects: { innovation: 8, talent: 5 }, msg: "Komunita roste organicky." },
  { title: "Zero-Day Exploit", text: "Kritická zranitelnost v produkci. Opravena za 4 hodiny.", effects: { funds: -4, innovation: 5, ethics: 3 }, msg: "Rychlá reakce je klíč." },
  { title: "Model Leak", text: "Váhy modelu na torrentu. Někdo z týmu?", effects: { innovation: -6, ethics: -4, funds: -3 }, msg: "Trust but verify." },
  { title: "API Milestone", text: "Miliardtý API request. Bez výpadku.", effects: { funds: 8, innovation: 5 }, msg: "Spolehlivost je tichý hrdina." },
  { title: "Virální Tweet", text: "Tvůj produkt se stal memem. V dobrém smyslu.", effects: { funds: 8, talent: 5 }, msg: "Organický growth je nejlepší." },
  { title: "Podcast Feature", text: "Lex Fridman tě pozval na 3h podcast. 5M lidí.", effects: { funds: 5, talent: 8, innovation: 3 }, msg: "Hluboký rozhovor > reklama." },
  { title: "TechCrunch Recenze", text: "Nejelegantnější AI řešení roku \u2014 napsal TechCrunch.", effects: { funds: 10, talent: 5 }, msg: "Dobrý PR otevírá dveře." },
  { title: "Product Hunt #1", text: "#1 na Product Hunt. Server nestíhá.", effects: { funds: 8, talent: 5, innovation: 3 }, msg: "Hype je droga — užívej zodpovědně." },
  { title: "AI Influencer", text: "Tech influencer udělal 20min review.", effects: { funds: 7, talent: 3 }, msg: "Jeden review > tisíc reklam." },
  { title: "Podcast Kontroverze", text: "Tvé komentáře o regulaci vyvolaly bouři.", effects: { ethics: -5, funds: 3, talent: 3 }, msg: "Viditelnost má svou cenu." },
  { title: "Glassdoor Drama", text: "Anonymní recenze: Skvělá technologie, toxický management.", effects: { talent: -8, ethics: -3 }, msg: "Kultura se nedá předstírat." },
  { title: "Negativní Review", text: "Influencer zničil tvůj produkt. 3M views.", effects: { funds: -7, talent: -3 }, msg: "Jedna špatná recenze bolí." },
  { title: "Novinářský Dotaz", text: "Investigativní novinář chce komentář k datovým praktikám.", effects: { ethics: -3, funds: -2 }, msg: "'No comment' je taky odpověď." },
  { title: "Talent z MIT", text: "Absolvent MIT poslal CV po přečtení tvého blogu.", effects: { talent: 10 }, msg: "Content marketing funguje." },
  { title: "Konference Berlín", text: "Standing ovation na AI summitu.", effects: { talent: 5, innovation: 5, funds: 5 }, msg: "Viditelnost přitahuje talenty." },
  { title: "Mentor z Googlu", text: "Bývalý VP Googlu nabízí mentoring.", effects: { talent: 8, innovation: 5 }, msg: "Moudrost zkušených je k nezaplacení." },
  { title: "Spontánní Bowling", text: "Tým na bowlingu. Morálka stoupla.", effects: { talent: 6 }, msg: "Nejlepší team building je neplánovaný." },
  { title: "Interní Hackathon", text: "24h hackathon — 3 nové prototypy.", effects: { innovation: 10, talent: 8 }, msg: "Kreativita potřebuje volnost." },
  { title: "Hackathon Výhra", text: "Junior tým vyhrál AI hackathon v Praze.", effects: { talent: 8, innovation: 5 }, msg: "Mladí mají energii." },
  { title: "Bonus Debata", text: "Tým chce bonusy. Cashflow napjatý.", effects: { talent: -3, funds: -5 }, msg: "Očekávání je třeba manažovat." },
  { title: "Tichý Odchod", text: "Klíčový developer odešel. Prý mu chyběl growth.", effects: { talent: -7, innovation: -4 }, msg: "Retence je levnější než nábor." },
  { title: "Diversity Award", text: "Cena za inkluzivní kulturu v tech.", effects: { talent: 6, ethics: 5 }, msg: "Různorodost = lepší rozhodnutí." },
  { title: "EU Grant", text: "Horizon Europe schválil grant.", effects: { funds: 15, ethics: 5 }, msg: "Brusel má rád etické AI." },
  { title: "Krádež IP", text: "Konkurent vydal téměř identický produkt.", effects: { innovation: -8, ethics: 3 }, msg: "Patentová ochrana by se hodila." },
  { title: "Neúspěšný Pitch", text: "Investoři řekli ne. Ale feedback cenný.", effects: { funds: -3, innovation: 5 }, msg: "Odmítnutí učí víc než přijetí." },
  { title: "Fortune 500 Klient", text: "Velká korporace chce pilotní projekt.", effects: { funds: 12, innovation: 5 }, msg: "Enterprise zákazníci mění hru." },
  { title: "Kurzový Šok", text: "Koruna oslabila. Dolarové příjmy vyskočily.", effects: { funds: 8 }, msg: "Forex pracuje pro tebe — tentokrát." },
  { title: "Opožděná Faktura", text: "Největší klient nezaplatil 3 měsíce.", effects: { funds: -10 }, msg: "Diverzifikace klientů je nutnost." },
  { title: "Akvizice Konkurenta", text: "Tvůj konkurent koupil Microsoft. Trh se mění.", effects: { funds: 5, innovation: -5 }, msg: "Krajina se posunula." },
  { title: "Patentový Troll", text: "Žaloba za porušení patentu z roku 2008.", effects: { funds: -8, ethics: -2 }, msg: "Patentový systém je rozbitý." },
  { title: "ÚOOÚ Návštěva", text: "Regulátor na neformální prohlídce. Vše OK.", effects: { ethics: 3, funds: -2 }, msg: "Compliance jako prevence." },
  { title: "Open Letter", text: "50 vědců chválí tvůj přístup k AI safety.", effects: { ethics: 10, talent: 5 }, msg: "Akademická komunita sleduje." },
  { title: "GDPR Pokuta", text: "Drobné porušení. Symbolická pokuta, velké headlines.", effects: { funds: -5, ethics: -5 }, msg: "Privacy by design." },
  { title: "Office Flood", text: "Praskla trubka nad serverovnou.", effects: { funds: -8 }, msg: "Pojistka to (většinou) pokryje." },
  { title: "Kabelový Zloděj", text: "200 metrů optiky ze sklepa. Klasika.", effects: { funds: -4 }, msg: "Praha moment." },
  { title: "Kancelář Praská", text: "Tým roste. Stěhování nutné.", effects: { funds: -8, talent: -3 }, msg: "Růst má své náklady." },
  { title: "Studentský Projekt", text: "Studenti z ČVUT postavili appku nad tvým API.", effects: { innovation: 5, talent: 3 }, msg: "Ekosystém se buduje sám." },
  { title: "Phishing Útok", text: "Někdo se vydával za tebe a žádal hesla.", effects: { ethics: -3, funds: -2 }, msg: "Security training je nutnost." },
  { title: "Bug Bounty", text: "Ethical hacker našel a nahlásil zranitelnost.", effects: { ethics: 5, funds: -5, innovation: 5 }, msg: "Lepší teď než po útoku." },
  { title: "Dopravní Kolaps", text: "D1 stojí. Půlka týmu nedorazila. Stand-up zrušen.", effects: { talent: -2 }, msg: "Remote first má výhody." },
  { title: "Nový Soused", text: "Konkurenční startup vedle. Sdílíte výtah i napětí.", effects: { innovation: 3, talent: -2 }, msg: "Motivace odjinud." },
  { title: "Firemní Pes", text: "Někdo přinesl psa. Produktivita dolů, morálka nahoru.", effects: { talent: 5, innovation: -2 }, msg: "Lidskost > výkon." },
  { title: "Pražský Blackout", text: "Výpadek proudu 3 hodiny. UPS naštěstí fungoval.", effects: { funds: -3, innovation: -2 }, msg: "Záložní zdroj se vyplatí." },
  { title: "Tech Meetup", text: "Organizuješ meetup v pražském hubu. 200 lidí.", effects: { talent: 7, funds: -3, innovation: 3 }, msg: "Komunita je superzbraň." },
  { title: "Vánoční Párty", text: "CTO zpívá karaoke. Video leaklo.", effects: { talent: 5, ethics: -2 }, msg: "Co se stane na párty..." },
  { title: "Letní Brigádníci", text: "Dva brigádníci plní nadšení. Jeden je génius.", effects: { talent: 5, innovation: 5, funds: -3 }, msg: "Čerstvá krev osvěžuje." },
  { title: "Recese v Kuchyňce", text: "Někdo pojmenoval meeting room 'Skynet'. HR zuří.", effects: { talent: 3 }, msg: "Humor drží tým pohromadě." },
];

/* ═══════════════════ HELPERS ═══════════════════ */

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function pickStoryEvent(week, usedIds) {
  const pool = EVENT_POOL.filter(e => week >= e.week[0] && week <= e.week[1] && !usedIds.has(e.id));
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function pickRandomEvent(usedSet) {
  let pool = RANDOM_EVENTS.map((e, i) => ({ ...e, _i: i })).filter(e => !usedSet.has(e._i));
  if (!pool.length) { usedSet.clear(); pool = RANDOM_EVENTS.map((e, i) => ({ ...e, _i: i })); }
  const pick = pool[Math.floor(Math.random() * pool.length)];
  usedSet.add(pick._i);
  return pick;
}

/* ═══════════════════ SHARE URL ═══════════════════ */

function encodeResult(ending, game, historyLen) {
  const d = [ending.id, game.week, game.funds, game.talent, game.ethics, game.innovation, game.aiThreat, historyLen];
  return btoa(d.join(","));
}

function decodeResult(hash) {
  try {
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!raw) return null;
    const parts = atob(raw).split(",");
    if (parts.length < 8) return null;
    const [id, week, funds, talent, ethics, innovation, aiThreat, decisions] = parts;
    const ending = ENDINGS.find(e => e.id === id);
    if (!ending) return null;
    return {
      ending,
      game: { week: +week, funds: +funds, talent: +talent, ethics: +ethics, innovation: +innovation, aiThreat: +aiThreat },
      decisions: +decisions,
    };
  } catch { return null; }
}

function shareText(ending, game, historyLen, url) {
  const b = v => { const f = Math.round((v / 100) * 10); return "█".repeat(f) + "░".repeat(10 - f); };
  return [
    `🎮 SINGULARITY: The Last Founder`,
    ``,
    `${ending.icon} ${ending.title} — týden ${game.week}/30`,
    ``,
    `◈ Funds      ${b(game.funds)} ${game.funds}`,
    `◉ Talent     ${b(game.talent)} ${game.talent}`,
    `◎ Ethics     ${b(game.ethics)} ${game.ethics}`,
    `◆ Innovation ${b(game.innovation)} ${game.innovation}`,
    `⚠ AI Threat  ${game.aiThreat}%`,
    ``,
    `${historyLen} rozhodnutí · 7 možných konců`,
    `Dokážeš dopadnout jinak?`,
    ``,
    url,
  ].join("\n");
}

/* ═══════════════════ COMPONENTS ═══════════════════ */

const Badge = ({ k, v }) => {
  const r = RESOURCES[k]; if (!r) return null;
  const pos = v > 0;
  return (
    <span style={{
      fontSize: 12, fontWeight: 600, fontFamily: "var(--fm)",
      color: pos ? r.color : "#e84057",
      background: pos ? `${r.color}18` : "rgba(232,64,87,0.12)",
      padding: "3px 8px", borderRadius: 4, whiteSpace: "nowrap",
      lineHeight: 1.3, display: "inline-block",
    }}>
      {r.icon}{v > 0 ? "+" : ""}{v}
    </span>
  );
};

const Badges = ({ fx }) => (
  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
    {Object.entries(fx).filter(([k]) => k in RESOURCES).map(([k, v]) => <Badge key={k} k={k} v={v} />)}
  </div>
);

const Bar = ({ value, max, color, label, icon }) => (
  <div style={{ flex: 1, minWidth: 140 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
      <span style={{ fontSize: 14, color: "#888", letterSpacing: 1, fontFamily: "var(--fm)" }}>{icon} {label}</span>
      <span style={{ fontSize: 18, color, fontWeight: 700, fontFamily: "var(--fm)" }}>{value}</span>
    </div>
    <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${clamp(value / max * 100, 0, 100)}%`,
        background: `linear-gradient(90deg, ${color}88, ${color})`,
        borderRadius: 4, transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
      }} />
    </div>
  </div>
);

const Threat = ({ value }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
    <span style={{ fontSize: 12, color: "#888", letterSpacing: 2, fontFamily: "var(--fm)" }}>AI THREAT</span>
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: 20 }).map((_, i) => {
        const on = i < Math.ceil(value / 100 * 20);
        const h = on ? clamp(120 - i / 20 * 120, 0, 120) : 0;
        return <div key={i} style={{ width: 10, height: 22, borderRadius: 2, background: on ? `hsl(${h},80%,55%)` : "rgba(255,255,255,0.06)", transition: "background .3s", boxShadow: on ? `0 0 6px hsl(${h},80%,55%,.4)` : "none" }} />;
      })}
    </div>
    <span style={{ fontSize: 15, fontWeight: 700, color: value > 70 ? "#e84057" : value > 40 ? "#e8a040" : "#7fda8f", fontFamily: "var(--fm)" }}>{value}%</span>
  </div>
);

/* ═══════════════════ MAIN ═══════════════════ */

export default function Singularity() {
  const [phase, setPhase] = useState("intro");
  const [game, setGame] = useState(null);
  const [evt, setEvt] = useState(null);
  const [reso, setReso] = useState(null);
  const [rndEvt, setRndEvt] = useState(null);
  const [ending, setEnding] = useState(null);
  const [usedStory, setUsedStory] = useState(new Set());
  const usedRnd = useRef(new Set());
  const [history, setHistory] = useState([]);
  const [fade, setFade] = useState(false);
  const [hover, setHover] = useState(-1);
  const [shareState, setShareState] = useState("idle");
  const [sharedResult, setSharedResult] = useState(null);

  // Parse shared result from URL hash on mount
  useEffect(() => {
    const result = decodeResult(window.location.hash);
    if (result) {
      setSharedResult(result);
      setPhase("shared");
      // Clean hash without triggering navigation
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => { setTimeout(() => setFade(true), 80); }, [phase]);

  const checkEndings = (g) => {
    for (const e of ENDINGS) if (e.condition(g)) {
      setEnding(e); setPhase("ending"); setFade(false);
      setTimeout(() => setFade(true), 80); return true;
    }
    return false;
  };

  const startGame = () => {
    setFade(false);
    setTimeout(() => {
      const g = { week: 0, funds: 50, talent: 50, ethics: 60, innovation: 40, aiThreat: 10 };
      setGame(g); setUsedStory(new Set()); usedRnd.current = new Set();
      setHistory([]); setShareState("idle");
      advanceWeek(g, new Set());
    }, 350);
  };

  const advanceWeek = (g, used) => {
    setFade(false); setHover(-1);
    setTimeout(() => {
      const ng = { ...g, week: g.week + 1, aiThreat: Math.min(100, g.aiThreat + 1 + Math.floor(Math.random() * 3)) };
      setGame(ng);
      if (checkEndings(ng)) return;
      const se = pickStoryEvent(ng.week, used);
      if (se) {
        const nu = new Set(used); nu.add(se.id);
        setUsedStory(nu); setEvt(se); setPhase("event");
      } else doRandom(ng);
      setFade(false); setTimeout(() => setFade(true), 80);
    }, 350);
  };

  const doRandom = (g) => {
    const re = pickRandomEvent(usedRnd.current);
    const ng = { ...g };
    Object.entries(re.effects).forEach(([k, v]) => { if (k in RESOURCES) ng[k] = clamp(ng[k] + v, 0, 100); });
    setGame(ng); setRndEvt(re); setPhase("random"); setFade(false); setTimeout(() => setFade(true), 80);
  };

  const choose = (ch) => {
    setFade(false);
    setTimeout(() => {
      const ng = { ...game };
      Object.entries(ch.effects).forEach(([k, v]) => { if (k in RESOURCES) ng[k] = clamp(ng[k] + v, 0, 100); });
      const src = evt.choices.find(c => c.label === ch.label);
      if (src?.aiThreat) ng.aiThreat = clamp(ng.aiThreat + src.aiThreat, 0, 100);
      setGame(ng); setReso(ch);
      setHistory(h => [...h, { week: ng.week, event: evt.title, choice: ch.label }]);
      setPhase("resolve"); setFade(false); setTimeout(() => setFade(true), 80);
    }, 300);
  };

  const cont = () => { Math.random() < 0.3 ? doRandom(game) : advanceWeek(game, usedStory); };
  const contRnd = () => advanceWeek(game, usedStory);

  const buildShareUrl = () => {
    const hash = encodeResult(ending, game, history.length);
    return `${window.location.origin}${window.location.pathname}#${hash}`;
  };

  const doShare = async () => {
    const url = buildShareUrl();
    const text = shareText(ending, game, history.length, url);
    if (navigator.share) {
      try { await navigator.share({ title: "Singularity: The Last Founder", text, url }); setShareState("shared"); setTimeout(() => setShareState("idle"), 3000); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    try { await navigator.clipboard.writeText(text); setShareState("copied"); } catch { setShareState("error"); }
    setTimeout(() => setShareState("idle"), 3000);
  };

  const restart = () => { setPhase("intro"); setFade(false); setTimeout(() => setFade(true), 80); setGame(null); setEnding(null); };

  /* ═══ STYLES ═══ */

  const root = {
    "--fs": "'Cormorant Garamond',Georgia,serif",
    "--fm": "'JetBrains Mono','SF Mono',monospace",
    "--bg": "#0d0d0f", "--srf": "rgba(255,255,255,0.03)",
    "--bdr": "rgba(255,255,255,0.08)", "--tx": "#d4d4d8",
    "--txd": "#71717a", "--acc": "#c9a84c",
    width: "100vw", minHeight: "100vh",
    background: "var(--bg)", color: "var(--tx)",
    fontFamily: "var(--fs)", display: "flex",
    flexDirection: "column", alignItems: "center",
    justifyContent: "flex-start",
    padding: "40px 24px 60px", boxSizing: "border-box", overflow: "auto",
  };

  const card = {
    maxWidth: 800, width: "100%",
    background: "var(--srf)", border: "1px solid var(--bdr)",
    borderRadius: 20, padding: "52px 48px",
    opacity: fade ? 1 : 0,
    transform: fade ? "translateY(0)" : "translateY(12px)",
    transition: "all .5s cubic-bezier(.4,0,.2,1)",
  };

  const pbtn = {
    fontFamily: "var(--fm)", fontSize: 14, fontWeight: 600,
    borderRadius: 12, cursor: "pointer", letterSpacing: 1.5,
    lineHeight: 1.5, transition: "all .2s",
    padding: "16px 32px", background: "var(--acc)",
    color: "#0d0d0f", border: "none", textAlign: "center",
    display: "inline-block",
  };
  const sbtn = { ...pbtn, background: "transparent", color: "var(--tx)", border: "1px solid var(--bdr)" };
  const tc = (t) => t === "light" ? "#7fda8f" : t === "amber" ? "var(--acc)" : "#e84057";

  return (
    <div style={root}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ═══ INTRO ═══ */}
      {phase === "intro" && (
        <div style={{ ...card, textAlign: "center", maxWidth: 700, marginTop: "8vh" }}>
          <div style={{ fontSize: 14, color: "var(--txd)", letterSpacing: 5, fontFamily: "var(--fm)", marginBottom: 32 }}>STRATEGIC NARRATIVE GAME</div>
          <h1 style={{ fontFamily: "var(--fs)", fontSize: 64, fontWeight: 700, margin: 0, color: "var(--acc)", lineHeight: 1.1 }}>Singularity</h1>
          <p style={{ fontStyle: "italic", color: "var(--txd)", margin: "12px 0 0", fontSize: 24 }}>The Last Founder</p>
          <div style={{ width: 48, height: 1, background: "var(--acc)", margin: "36px auto", opacity: .4 }} />
          <p style={{ fontSize: 20, lineHeight: 1.9, color: "#a1a1aa", maxWidth: 520, margin: "0 auto 12px" }}>Rok 2026. Založil jsi AI startup s vizí změnit svět. Ale technologie, kterou vytváříš, je mocnější, než jsi čekal.</p>
          <p style={{ fontSize: 20, lineHeight: 1.9, color: "#a1a1aa", maxWidth: 520, margin: "0 auto 40px" }}>Každý týden přináší rozhodnutí bez správné odpovědi. Tvé volby definují budoucnost — nejen firmy, ale celého lidstva.</p>
          <button onClick={startGame} style={{ ...pbtn, padding: "18px 56px", fontSize: 16, letterSpacing: 3 }}>ZAČÍT HRU</button>
          <div style={{ marginTop: 36, fontSize: 13, color: "var(--txd)", fontFamily: "var(--fm)", lineHeight: 2.2 }}>30 týdnů · 7 konců · {EVENT_POOL.length + RANDOM_EVENTS.length} unikátních událostí</div>
        </div>
      )}

      {/* ═══ HUD ═══ */}
      {game && phase !== "intro" && phase !== "ending" && (
        <div style={{ maxWidth: 800, width: "100%", marginBottom: 28, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--fm)", fontSize: 14, color: "var(--txd)", letterSpacing: 2 }}>TÝDEN {game.week} / 30</span>
            <Threat value={game.aiThreat} />
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {Object.entries(RESOURCES).map(([k, r]) => <Bar key={k} value={game[k]} max={r.max} color={r.color} label={r.label} icon={r.icon} />)}
          </div>
          <div style={{ height: 1, background: "var(--bdr)", marginTop: 4 }} />
        </div>
      )}

      {/* ═══ EVENT ═══ */}
      {phase === "event" && evt && (
        <div style={card}>
          <div style={{ fontSize: 13, color: "var(--acc)", letterSpacing: 3, fontFamily: "var(--fm)", marginBottom: 20 }}>TÝDEN {game.week} — ROZHODNUTÍ</div>
          <h2 style={{ fontFamily: "var(--fs)", fontSize: 38, fontWeight: 700, margin: "0 0 16px", lineHeight: 1.2 }}>{evt.title}</h2>
          <p style={{ fontSize: 20, lineHeight: 1.9, color: "#a1a1aa", margin: "0 0 36px" }}>{evt.text}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {evt.choices.map((ch, i) => {
              const isH = hover === i;
              return (
                <button key={i} onClick={() => choose(ch)} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(-1)}
                  style={{
                    fontFamily: "var(--fm)", fontSize: 15, fontWeight: 500,
                    borderRadius: 12, cursor: "pointer", letterSpacing: .3, lineHeight: 1.5,
                    transition: "background .15s, border-color .15s",
                    width: "100%", textAlign: "left", padding: "18px 22px",
                    background: isH ? "rgba(255,255,255,0.06)" : "transparent",
                    color: "var(--tx)",
                    border: `1px solid ${isH ? "rgba(201,168,76,.4)" : "var(--bdr)"}`,
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{
                      flexShrink: 0, width: 12, height: 12, borderRadius: "50%",
                      border: `2px solid ${isH ? "var(--acc)" : "var(--txd)"}`,
                      background: isH ? "var(--acc)" : "transparent",
                      transition: "all .15s",
                    }} />
                    <span style={{ flex: 1, minWidth: 100 }}>{ch.label}</span>
                    <Badges fx={ch.effects} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ RESOLVE ═══ */}
      {phase === "resolve" && reso && (
        <div style={card}>
          <div style={{ fontSize: 13, color: "#7fda8f", letterSpacing: 3, fontFamily: "var(--fm)", marginBottom: 20 }}>DŮSLEDEK</div>
          <h3 style={{ fontFamily: "var(--fs)", fontSize: 30, fontWeight: 600, margin: "0 0 14px", color: "var(--acc)" }}>&#8222;{reso.label}&#8220;</h3>
          <p style={{ fontSize: 20, lineHeight: 1.9, color: "#a1a1aa", margin: "0 0 28px" }}>{reso.consequence}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 32 }}>
            {Object.entries(reso.effects).filter(([k]) => k in RESOURCES).map(([k, v]) => {
              const r = RESOURCES[k]; const pos = v > 0;
              return <span key={k} style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--fm)", color: pos ? r.color : "#e84057", background: pos ? `${r.color}14` : "rgba(232,64,87,0.1)", padding: "10px 16px", borderRadius: 8, border: `1px solid ${pos ? `${r.color}30` : "rgba(232,64,87,.2)"}` }}>{r.icon} {r.label} {pos ? "+" : ""}{v}</span>;
            })}
          </div>
          <button onClick={cont} style={pbtn}>POKRAČOVAT →</button>
        </div>
      )}

      {/* ═══ RANDOM ═══ */}
      {phase === "random" && rndEvt && (
        <div style={card}>
          <div style={{ fontSize: 13, color: "#6eb5ff", letterSpacing: 3, fontFamily: "var(--fm)", marginBottom: 20 }}>⚡ NEČEKANÁ UDÁLOST</div>
          <h3 style={{ fontFamily: "var(--fs)", fontSize: 30, fontWeight: 600, margin: "0 0 14px" }}>{rndEvt.title}</h3>
          <p style={{ fontSize: 20, lineHeight: 1.9, color: "#a1a1aa", margin: "0 0 24px" }}>{rndEvt.text}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            {Object.entries(rndEvt.effects).filter(([k]) => k in RESOURCES).map(([k, v]) => {
              const r = RESOURCES[k]; const pos = v > 0;
              return <span key={k} style={{ fontSize: 14, fontWeight: 600, fontFamily: "var(--fm)", color: pos ? r.color : "#e84057", padding: "10px 16px", borderRadius: 8, background: pos ? `${r.color}14` : "rgba(232,64,87,0.1)", border: `1px solid ${pos ? `${r.color}30` : "rgba(232,64,87,.2)"}` }}>{r.icon} {pos ? "+" : ""}{v}</span>;
            })}
          </div>
          <p style={{ fontSize: 15, fontStyle: "italic", color: "var(--txd)", margin: "0 0 32px" }}>{rndEvt.msg}</p>
          <button onClick={contRnd} style={pbtn}>POKRAČOVAT →</button>
        </div>
      )}

      {/* ═══ SHARED RESULT ═══ */}
      {phase === "shared" && sharedResult && (() => {
        const { ending: se, game: sg, decisions } = sharedResult;
        const stc = (t) => t === "light" ? "#7fda8f" : t === "amber" ? "var(--acc)" : "#e84057";
        return (
          <div style={{ ...card, textAlign: "center", maxWidth: 720, borderColor: se.tone === "light" ? "rgba(127,218,143,.25)" : se.tone === "amber" ? "rgba(201,168,76,.25)" : "rgba(232,64,87,.25)" }}>
            <div style={{ fontSize: 12, letterSpacing: 3, fontFamily: "var(--fm)", marginBottom: 24, color: "var(--txd)", textTransform: "uppercase" }}>Sdílený výsledek</div>
            <div style={{ fontSize: 76, marginBottom: 20 }}>{se.icon}</div>
            <div style={{ fontSize: 13, letterSpacing: 4, fontFamily: "var(--fm)", marginBottom: 16, color: stc(se.tone) }}>KONEC — TÝDEN {sg.week}</div>
            <h2 style={{ fontFamily: "var(--fs)", fontSize: 48, fontWeight: 700, margin: "0 0 20px", color: stc(se.tone) }}>{se.title}</h2>
            <p style={{ fontSize: 21, lineHeight: 1.9, color: "#a1a1aa", margin: "0 auto 36px", maxWidth: 540 }}>{se.desc}</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 36, padding: 28, background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid var(--bdr)" }}>
              {Object.entries(RESOURCES).map(([k, r]) => (
                <div key={k} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "var(--txd)", letterSpacing: 1, fontFamily: "var(--fm)" }}>{r.icon} {r.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: r.color, fontFamily: "var(--fm)" }}>{sg[k]}</div>
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1", textAlign: "center", paddingTop: 12, borderTop: "1px solid var(--bdr)" }}>
                <div style={{ fontSize: 13, color: "var(--txd)", letterSpacing: 1, fontFamily: "var(--fm)" }}>⚠ AI Threat</div>
                <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "var(--fm)", color: sg.aiThreat > 70 ? "#e84057" : sg.aiThreat > 40 ? "#e8a040" : "#7fda8f" }}>{sg.aiThreat}%</div>
              </div>
            </div>

            <div style={{ fontSize: 15, color: "var(--txd)", fontFamily: "var(--fm)", marginBottom: 32 }}>{decisions} rozhodnutí · 7 možných konců</div>

            <button onClick={startGame} style={{ ...pbtn, padding: "18px 56px", fontSize: 16, letterSpacing: 3 }}>ZKUS TO TAKY →</button>
            <div style={{ marginTop: 28, fontSize: 13, color: "var(--txd)", fontFamily: "var(--fm)" }}>Dokážeš dopadnout jinak?</div>
          </div>
        );
      })()}

      {/* ═══ ENDING ═══ */}
      {phase === "ending" && ending && (
        <div style={{ ...card, textAlign: "center", maxWidth: 720, borderColor: ending.tone === "light" ? "rgba(127,218,143,.25)" : ending.tone === "amber" ? "rgba(201,168,76,.25)" : "rgba(232,64,87,.25)" }}>
          <div style={{ fontSize: 76, marginBottom: 20 }}>{ending.icon}</div>
          <div style={{ fontSize: 13, letterSpacing: 4, fontFamily: "var(--fm)", marginBottom: 16, color: tc(ending.tone) }}>KONEC — TÝDEN {game.week}</div>
          <h2 style={{ fontFamily: "var(--fs)", fontSize: 48, fontWeight: 700, margin: "0 0 20px", color: tc(ending.tone) }}>{ending.title}</h2>
          <p style={{ fontSize: 21, lineHeight: 1.9, color: "#a1a1aa", margin: "0 auto 36px", maxWidth: 540 }}>{ending.desc}</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 36, padding: 28, background: "rgba(255,255,255,0.02)", borderRadius: 14, border: "1px solid var(--bdr)" }}>
            {Object.entries(RESOURCES).map(([k, r]) => (
              <div key={k} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: "var(--txd)", letterSpacing: 1, fontFamily: "var(--fm)" }}>{r.icon} {r.label}</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: r.color, fontFamily: "var(--fm)" }}>{game[k]}</div>
              </div>
            ))}
            <div style={{ gridColumn: "1 / -1", textAlign: "center", paddingTop: 12, borderTop: "1px solid var(--bdr)" }}>
              <div style={{ fontSize: 13, color: "var(--txd)", letterSpacing: 1, fontFamily: "var(--fm)" }}>⚠ AI Threat</div>
              <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "var(--fm)", color: game.aiThreat > 70 ? "#e84057" : game.aiThreat > 40 ? "#e8a040" : "#7fda8f" }}>{game.aiThreat}%</div>
            </div>
          </div>

          {history.length > 0 && (
            <details style={{ textAlign: "left", marginBottom: 32 }}>
              <summary style={{ fontSize: 14, color: "var(--txd)", cursor: "pointer", fontFamily: "var(--fm)", letterSpacing: 1 }}>HISTORIE ROZHODNUTÍ ({history.length})</summary>
              <div style={{ marginTop: 14, maxHeight: 240, overflow: "auto", paddingRight: 8 }}>
                {history.map((h, i) => (
                  <div key={i} style={{ fontSize: 14, fontFamily: "var(--fm)", color: "var(--txd)", padding: "8px 0", borderBottom: "1px solid var(--bdr)", lineHeight: 1.6 }}>
                    <span style={{ color: "var(--acc)" }}>W{h.week}</span> {h.event} → <span style={{ color: "var(--tx)" }}>{h.choice}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={doShare} style={{
              ...pbtn, padding: "16px 36px",
              background: shareState === "copied" ? "#7fda8f" : shareState === "shared" ? "#6eb5ff" : shareState === "error" ? "#e84057" : "var(--acc)",
              transition: "background .3s",
            }}>
              {shareState === "copied" ? "✓ ZKOPÍROVÁNO" : shareState === "shared" ? "✓ SDÍLENO" : shareState === "error" ? "✗ CHYBA" : "📤 SDÍLET VÝSLEDEK"}
            </button>
            <button onClick={restart} style={{ ...sbtn, padding: "16px 36px" }}>↻ HRÁT ZNOVU</button>
          </div>
          <div style={{ marginTop: 28, fontSize: 13, color: "var(--txd)", fontFamily: "var(--fm)" }}>{ENDINGS.filter(e => e.id !== ending.id).length} dalších konců k objevení</div>
        </div>
      )}
    </div>
  );
}
