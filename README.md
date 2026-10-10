# Pogodi pjesmu

Kviz pogađanja pjesama za dva tima na jednom mobitelu. Pjesma kreće od nasumičnog mjesta, tko prvi zna udara STOP i odgovara naglas, a domaćin prikazuje odgovor i dodjeljuje bod.

Igra: https://uredtride-cpu.github.io/Pogodi-pjesmu/

## Liste i izvori

| Lista | Izvor |
|---|---|
| Hitovi 90-ih | Music Week / OCC Top 20 singlova 90-ih (UK) + Billboard Top 20 Hot 100 hitova 90-ih (US) |
| Top 100 svih vremena | Billboard Greatest of All Time Hot 100 (2021) |
| Rock i metal | VH1 100 Greatest Hard Rock Songs (2009) |
| Novi val (HR) | Rock Express Top 100 YU rock pjesama |

Ugrađeni linkovi su provjereni preko YouTube oEmbed servisa (naslov + kanal). Prednost imaju službeni kanali i studijske verzije. Live ili fan verzija je označena i koristi se samo kad službene nema.

## Automatsko održavanje linkova (GitHub Actions)

Mobitel ne treba nikakav ključ. Linkove održava posao **Popuni linkove** (`.github/workflows/fill-links.yml`, skripta `tools/fill-links.mjs`):

- pokreće se kad se promijeni `data.js`, svaki dan ujutro i ručno (Actions → Popuni linkove → Run workflow),
- provjerava svaki video: postoji li još, je li javan, smije li se ugraditi u igru i **smije li se puštati u Hrvatskoj**,
- za pjesme bez ispravnog videa traži zamjenu (službeni "Topic"/VEVO kanal ima prednost, karaoke/cover/remix se odbacuju, live samo ako nema drugog),
- rezultat sprema u `links.json`, koji igra učita pri pokretanju.

Redoslijed u igri: link koji si ručno zalijepio na mobitelu > link iz `links.json` > ugrađeni link iz `data.js`.

### Jednokratno postavljanje

1. **API ključ**: https://console.cloud.google.com/ → novi projekt → APIs & Services → Library → **YouTube Data API v3** → Enable → Credentials → Create credentials → **API key**.
   Na ključu: **Application restrictions → None** (poziva ga GitHub server, ne preglednik) i **API restrictions → Restrict key → YouTube Data API v3**. Save.
2. **Tajna na GitHubu**: repozitorij → **Settings → Secrets and variables → Actions → New repository secret**. Name: `YT_API_KEY`, Secret: zalijepi ključ. Add secret.
3. **Prvo pokretanje**: kartica **Actions → Popuni linkove → Run workflow**. Za 1–2 minute u `links.json` stižu linkovi, a nakon objave i u igru.

Kvota: provjera svih videa troši oko 5 jedinica, a jedna pretraga 100 (besplatno 10.000 dnevno). Skripta radi najviše 90 pretraga po pokretanju, a ostatak nastavlja sutradan.
