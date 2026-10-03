export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://myaka.rumiscola.ru").replace(/\/$/, "");
export const siteName = "Мяка";
export const siteTitle = "Мяка — рисованный кот и маленькие истории";
export const siteDescription =
  "Мяка — рисованный кот Соры и герой маленьких историй о повседневной жизни. Рисунки, кошачьи привычки, настроение и интерактивный персонаж.";

export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}#website`,
  url: siteUrl,
  name: siteName,
  description: siteDescription,
  inLanguage: "ru-RU",
  publisher: {
    "@type": "Organization",
    name: "Студия Велром",
    url: "https://RumIsCola.ru/",
  },
  about: {
    "@type": "CreativeWork",
    name: "Мяка",
    description: "Рисованный кот и герой маленьких историй о повседневной жизни.",
    creator: { "@type": "Person", name: "Сора" },
    copyrightHolder: { "@type": "Organization", name: "Студия Велром" },
  },
};
