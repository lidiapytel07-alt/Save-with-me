# Moje oszczednosci

Prosta aplikacja do zapisywania i sumowania oszczednosci. Dziala lokalnie w przegladarce, bez logowania i bez serwera.

## Jak uruchomic

1. Otworz plik `index.html` w przegladarce.
2. Dodaj swoje pozycje oszczednosci.
3. Ustaw cel, jesli chcesz widziec postep.

## Funkcje

- dodawanie, edycja i usuwanie pozycji,
- automatyczna suma wszystkich oszczednosci,
- cel oszczedzania i pasek postepu,
- podsumowanie kategorii,
- wyszukiwanie po nazwie, miejscu lub kategorii,
- opcjonalna synchronizacja wspolnych danych przez Supabase,
- eksport i import danych przez plik JSON,
- jasny i ciemny motyw.

## Wazne

Dane bez konfiguracji synchronizacji zapisuja sie w `localStorage`, czyli lokalnie w przegladarce na danym komputerze. Jesli chcesz miec te same dane z druga osoba, skonfiguruj sekcje **Wspolne dane** w aplikacji.

## Wspolne dane z druga osoba

Najprostszy wariant to darmowy projekt w Supabase. Po konfiguracji obie osoby uzywaja tej samej aplikacji, wpisuja ten sam URL, klucz `anon` i to samo ID skarbonki.

1. Wejdz na `https://supabase.com` i utworz projekt.
2. W projekcie otworz **SQL Editor**.
3. Uruchom ten SQL:

```sql
create table if not exists savings_states (
  vault_id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table savings_states disable row level security;
```

4. Wejdz w **Project Settings** -> **API**.
5. Skopiuj:
   - Project URL,
   - public anon key.
6. W aplikacji rozwin **Wspolne dane**.
7. Wklej Project URL i anon key.
8. Wpisz wspolne ID skarbonki, np. `nasze-oszczednosci-2026`.
9. Kliknij **Polacz**.

Te same trzy wartosci podaj drugiej osobie. Od tego momentu aplikacja zapisuje zmiany do wspolnej tabeli i co 30 sekund pobiera aktualny stan.

Uwaga: to prosta konfiguracja dla prywatnego, domowego uzycia. Nie traktuj publicznego klucza `anon` i ID skarbonki jak zabezpieczenia bankowego. Do bardzo wrazliwych danych lepiej dolozyc logowanie.

## Jak wrzucic do Git

Po zainstalowaniu Git wejdz w folder projektu i uruchom:

```powershell
git init
git add .
git commit -m "Dodaj aplikacje do sumowania oszczednosci"
```

Potem utworz puste repozytorium na GitHubie i polacz je z lokalnym projektem:

```powershell
git branch -M main
git remote add origin ADRES_REPOZYTORIUM
git push -u origin main
```

Adres repozytorium bedzie wygladal podobnie do:

```text
https://github.com/twoj-login/moje-oszczednosci.git
```
