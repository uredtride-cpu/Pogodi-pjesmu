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

## YouTube API ključ (za automatsko traženje linkova)

Ključ se upisuje u ekranu **Pregled pjesama** i sprema **samo u pregledniku na tvom mobitelu** (localStorage). Nikad nije u ovom repozitoriju.

1. Otvori https://console.cloud.google.com/ i prijavi se Google računom.
2. Gore lijevo **Select a project → New project**, ime npr. `pogodi-pjesmu`, **Create**.
3. **APIs & Services → Library**, potraži **YouTube Data API v3** i stisni **Enable**.
4. **APIs & Services → Credentials → Create credentials → API key**. Kopiraj ključ (počinje s `AIza`).
5. Na tom ključu stisni **Edit** i ograniči ga:
   - **Application restrictions → Websites**, dodaj `https://uredtride-cpu.github.io/*`
   - **API restrictions → Restrict key → YouTube Data API v3**
   - **Save**. Ograničenja se primijene za par minuta.
6. U igri: **Pregled pjesama** → zalijepi ključ → **Spremi** → **Automatski pronađi linkove**.

Kvota: jedna pretraga troši 100 od besplatnih 10.000 jedinica dnevno, dakle oko 100 pjesama dnevno. Ako kvota ponestane, igra pamti dokle je stigla pa sutra nastavlja.

Zašto ograničenja u koraku 5: ključ se šalje iz preglednika pa ga netko vješt može vidjeti. Ograničen na ovu stranicu i samo YouTube API, beskoristan je drugdje.
