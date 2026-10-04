# HaloBlisko

Almost half of Europe's population aged over 65 report difficulty with at least one personal care or everyday activity. That's approximately 38.8 million people in Europe, which includes 4.3 million people in Poland. In Krakow, 1 in 4 people struggle with mobility or daily tasks. And out of 182,000 people of retirement age, only approximately 1,900 are under MOPS care.

To improve elderly people's access to everyday help, we created a mobile application connecting volunteers to requests for assistance in everyday activities and personal care. Volunteers can provide assistance with collecting medication, walking, personal care, and shopping. Every request for assistance is coordinated by MOPS, who select the most appropriate volunteer from those that offered help in response to the request.

Osoba w domu mówi, czego potrzebuje. Koordynatorka filii słyszy nagranie i wybiera jedną osobę ze swojej listy. Reszta listy tego zgłoszenia nie widzi.

To aplikacja w przeglądarce, nie program ze sklepu. Płaci gmina za filię, nie senior i nie wolontariusz.

## Jak to działa

1. W domu jest jedno nagranie. Druga kontrola anuluje otwartą prośbę.
2. Nagranie słyszy koordynatorka. Wolontariusze go nie słyszą. Jeśli w nagraniu padnie czterocyfrowy kod, trafia do sprawy i znika z tekstu, który widzą inni. PESEL jest już w teczce ośrodka.
3. Koordynatorka poprawia zdanie, jeśli trzeba, i wybiera jedną osobę z listy filii. Pod imieniem jest spokojna informacja, ile zwykle trwa taka sama sprawa.
4. Ta osoba widzi zadanie bez adresu. Po „Przyjmij zadanie” pojawiają się adres, PESEL i kod. Po „Zakończ zadanie” znikają.

Nowych osób nikt w aplikacji nie szuka. Do listy dodaje je ośrodek. Każda organizacja ma własną listę.

## Trzy wejścia

- Dom Anny: `/d/home-anna`
- Koordynatorka: `/coord`
- Wolontariusz Jan: `/v?as=v-jan`

```bash
pnpm install
pnpm dev
```

Potem otwórz [http://localhost:3000](http://localhost:3000) w wąskim oknie, jak na telefonie. Mikrofon w telefonie potrzebuje adresu `https`.
