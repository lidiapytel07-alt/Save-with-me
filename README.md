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

Najprostszy wariant to darmowy projekt w Supabase. Po konfiguracji obie osoby uzywaja tej samej aplikacji, wpisuja ten sam URL, klucz `publishable` i to samo ID skarbonki.

1. Wejdz na `https://supabase.com` i utworz projekt.
2. W projekcie otworz **SQL Editor**.
3. Uruchom ten SQL:

```sql
create table if not exists savings_states (
  vault_id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.savings_states enable row level security;

grant usage on schema public to anon;
grant select, insert, update on public.savings_states to anon;

drop policy if exists "read shared savings" on public.savings_states;
drop policy if exists "insert shared savings" on public.savings_states;
drop policy if exists "update shared savings" on public.savings_states;

create policy "read shared savings"
on public.savings_states
for select
to anon
using (true);

create policy "insert shared savings"
on public.savings_states
for insert
to anon
with check (true);

create policy "update shared savings"
on public.savings_states
for update
to anon
using (true)
with check (true);
```

4. Wejdz w **Project Settings** -> **API**.
5. Skopiuj:
   - Project URL,
   - Publishable key.
6. W aplikacji rozwin **Wspolne dane**.
7. Wklej Project URL i Publishable key.
   - Project URL powinien wygladac tak: `https://twoj-projekt.supabase.co`
   - Jesli skopiujesz adres konczacy sie na `/rest/v1`, aplikacja sama go poprawi.
   - Nie wklejaj adresu panelu Supabase z `supabase.com/dashboard/...`.
8. Wpisz wspolne ID skarbonki, np. `nasze-oszczednosci-2026`.
9. Kliknij **Synchronizuj**.

Te same trzy wartosci podaj drugiej osobie. Od tego momentu aplikacja zapisuje zmiany do wspolnej tabeli i co 30 sekund pobiera aktualny stan.

Uwaga: to prosta konfiguracja dla prywatnego, domowego uzycia. Nie traktuj publicznego klucza `publishable` i ID skarbonki jak zabezpieczenia bankowego. Do bardzo wrazliwych danych lepiej dolozyc logowanie.

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
