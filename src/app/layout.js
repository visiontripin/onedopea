import './globals.css';

export const metadata = {
  title: 'ONEDOPEA — цифровые продукты',
  description: 'Портфолио ONEDOPEA: Telegram-продукты, музыка, видео и интерактивные эксперименты.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
