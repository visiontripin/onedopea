        /* ==========================================================================
           [V7] ЛЕНТА DOPE «КАК НАСТОЯЩАЯ»: данные публикаций и настройки кота
           --------------------------------------------------------------------------
           Каждая публикация — реальная карточка портфолио (проект или аудио).
           У каждой свой сценарий кота-логотипа в «фото профиля» карточки:
             dance   — танцует (первая публикация)
             scratch — царапает окошко с логотипом
             climb   — вылезает из рамки аватара и гуляет по верхней кромке карточки
             peek    — выглядывает и моргает
             play    — играет с волной/глифом
             sleep   — дремлет
             chase   — гоняется за курсором
             jump    — прыгает на кнопку лайка
           ========================================================================== */
        const DOPE_POSTS = [
            {
                id: 'audio-enough-z',
                kind: 'audio',
                title: 'ONE DOPE · Аудиорелизы',
                meta: 'SoundCloud · 2 трека',
                subtitle: 'Enough Z / Amen',
                cover: 'https://i1.sndcdn.com/artworks-zY6ZlGoRfGMKTXpz-S3EGpA-t500x500.jpg',
                copy: 'Два авторских релиза под общей обложкой Enough Z: свежий трек Enough Z и Amen — ломаный ритм, плотная басовая текстура и звуковая атмосфера пространства ONEDOPEA.',
                tags: ['enoughz', 'amen', 'neurofunk'],
                likes: 64, comments: 6, reposts: 5, saves: 19,
                cat: 'dance',
                art: null
            },
            {
                id: 'botcontrol',
                kind: 'project',
                title: 'BOTCONTROL',
                meta: 'Платформа · Android + Desktop',
                subtitle: 'Автономная среда Telegram-ботов',
                cover: null,
                copy: 'Автономная среда для сборки и круглосуточного запуска Telegram-ботов со смартфона или ПК без аренды VPS: визуальные сценарии, cron-расписания, локальные модели LiteRT-LM и совместимость с Python.',
                tags: ['botcontrol', 'telegram', 'android', 'local-ai'],
                likes: 94, comments: 8, reposts: 4, saves: 17,
                cat: 'scratch',
                mark: 'assets/projects/botcontrol-mark.svg',
                art: 'assets/projects/botcontrol-app.svg'
            },
            {
                id: 'titan',
                kind: 'project',
                title: 'ТИТАН',
                meta: 'Веб-сервис · Спецтехника 24/7',
                subtitle: 'Аренда автокранов 14–500 т',
                cover: null,
                copy: 'Сервис круглосуточной аренды автокранов по Москве и области с подачей от 60 минут и фиксированной сметой до выезда. Инженерный калькулятор подбирает технику по массе груза и вылету стрелы.',
                tags: ['титан', 'спецтехника', 'b2b'],
                likes: 88, comments: 6, reposts: 5, saves: 19,
                cat: 'climb',
                mark: 'assets/projects/titan-mark.svg',
                art: 'assets/projects/titan-calc.svg'
            },
            {
                id: 'vision',
                kind: 'project',
                title: 'VISION AUDIO',
                meta: 'Музыкальная платформа · Local-First',
                subtitle: 'Плеер без рекламы и шума',
                cover: null,
                copy: 'Независимая музыкальная экосистема и веб-плеер без рекламы: фонотека офлайн в IndexedDB, живая волновая форма в Web Audio, смарт-плейлисты и поток «Моя волна».',
                tags: ['vision', 'webaudio', 'local-first'],
                likes: 91, comments: 7, reposts: 6, saves: 23,
                cat: 'play',
                mark: 'assets/projects/vision-mark.svg',
                art: 'assets/projects/vision-player.svg'
            },
            {
                id: 'podrabotka',
                kind: 'project',
                title: 'ПОДРАБОТКА.МСК',
                meta: 'Платформа смен · Три роли',
                subtitle: 'Разовые смены 4–12 часов',
                cover: null,
                copy: 'Платформа проверенных разовых смен с быстрыми выплатами и нулевой комиссией для исполнителя: фильтр по метро и МЦД, отклик в один клик, чат, воронка набора бригады и очередь верификации.',
                tags: ['подработка', 'москва', 'react'],
                likes: 105, comments: 9, reposts: 6, saves: 21,
                cat: 'peek',
                mark: 'assets/projects/podrabotka-mark.svg',
                art: 'assets/projects/podrabotka-shifts.svg'
            },
            {
                id: 'afisha',
                kind: 'project',
                title: 'ЛЕСНОЕ·АФИША',
                meta: 'Гиперлокальный сервис · Карта района',
                subtitle: 'События и соседский досуг',
                cover: null,
                copy: 'Гиперлокальная платформа событий Пригорода Лесное: интерактивная векторная карта домов и площадок, семейные и бесплатные фильтры, планы участия, кабинеты жителя и организатора.',
                tags: ['афиша', 'карта', 'комьюнити'],
                likes: 84, comments: 6, reposts: 5, saves: 16,
                cat: 'chase',
                mark: 'assets/projects/afisha-mark.svg',
                art: 'assets/projects/afisha-map.svg'
            },
            {
                id: 'perekur',
                kind: 'project',
                title: 'ПЕРЕКУР+',
                meta: 'PWA и Windows · Ритм рабочего дня',
                subtitle: 'Перерывы по расписанию',
                cover: null,
                copy: 'Веб-приложение и настольная утилита для здорового ритма дня: защита фоновой вкладки от засыпания через Web Worker и Wake Lock, голосовые напоминания и журнал сигналов.',
                tags: ['перекур', 'pwa', 'таймер'],
                likes: 79, comments: 5, reposts: 4, saves: 18,
                cat: 'sleep',
                mark: 'assets/projects/perekur-mark.svg',
                art: 'assets/projects/perekur-app.svg'
            },
            {
                id: 'ex',
                kind: 'project',
                title: 'EX · ЭКСПЕРИМЕНТ',
                meta: 'Документальный проект · Круг 10–25',
                subtitle: 'Сколько людей можно знать лично',
                cover: null,
                copy: 'Вечерние круги незнакомых участников со стартовым бюджетом 0 €, две минуты внимания каждому и проверка памяти через сутки и месяц на дистанции 100 → 500 → 1 000 встреч.',
                tags: ['ex', 'эксперимент', 'люди'],
                likes: 76, comments: 7, reposts: 5, saves: 14,
                cat: 'jump',
                mark: 'assets/projects/ex-mark.svg',
                art: 'assets/projects/ex-circle.svg'
            }
        ];
