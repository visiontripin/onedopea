import './globals.css';

export const metadata = {
  title: 'ONEDOPEA — цифровые продукты',
  description: 'Портфолио ONEDOPEA: веб-сервисы, Telegram-платформа BotControl, ТИТАН, Vision Audio, Подработка.МСК, Лесное·Афиша, Перекур+, музыка и интерактивные эксперименты.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
