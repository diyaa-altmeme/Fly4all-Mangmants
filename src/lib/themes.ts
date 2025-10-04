

import type { ThemeCustomizationSettings as ThemeConfig } from './types';

export type ThemeSettings = {
    id: string;
    name: string;
    description: string;
    config: ThemeConfig;
};

export const THEMES: ThemeSettings[] = [
    {
        id: 'mudarib-modern',
        name: 'Mudarib Modern',
        description: 'الثيم الافتراضي الحديث بألوان زرقاء وبرتقالية.',
        config: {
            light: {
                background: '220 100% 97%', // Light Blue
                foreground: '220 13% 20%',
                card: '0 0% 100%',
                primary: '217 100% 73%', // Soft Blue
                primaryForeground: '220 13% 10%',
                secondary: '210 40% 96.1%',
                accent: '30 100% 60%', // Orange
                border: '220 13% 91%',
                input: '220 13% 91%',
                ring: '217 100% 73%',
                radius: '12px',
            },
            dark: {
                background: '222 47% 11%',
                foreground: '210 40% 98%',
                card: '222 47% 15%',
                primary: '217 100% 73%',
                primaryForeground: '210 40% 98%',
                secondary: '217 33% 17%',
                accent: '30 100% 60%',
                border: '217 33% 25%',
                input: '217 33% 25%',
                ring: '217 100% 73%',
                radius: '12px',
            },
            loader: {
                color: '#73A2FF', // Soft Blue
                height: 3,
                showShadow: true,
            },
            card: {
                headerClientColorFrom: 'hsl(217, 90%, 60%)',
                headerClientColorTo: 'hsl(217, 100%, 73%)',
                headerSupplierColorFrom: 'hsl(30, 90%, 55%)',
                headerSupplierColorTo: 'hsl(30, 100%, 60%)',
                headerBothColorFrom: 'hsl(217, 90%, 60%)',
                headerBothColorTo: 'hsl(30, 100%, 60%)',
            }
        },
    },
    {
        id: 'desert-mirage',
        name: 'السراب الصحراوي',
        description: 'ألوان ترابية دافئة مع لمسات ذهبية.',
        config: {
            light: {
                background: '39 31% 94%', // Papaya Whip
                foreground: '39 44% 20%', // Dark Brown
                card: '0 0% 100%',
                primary: '39 84% 52%', // Gold
                primaryForeground: '39 44% 15%',
                secondary: '39 25% 90%',
                accent: '25 80% 50%', // Sienna
                border: '39 20% 85%',
                input: '39 20% 85%',
                ring: '39 84% 52%',
                radius: '8px',
            },
            dark: {
                background: '39 44% 10%', // Dark brown bg
                foreground: '39 31% 94%',
                card: '39 44% 15%',
                primary: '39 84% 62%', // Brighter Gold
                primaryForeground: '39 31% 94%',
                secondary: '39 44% 20%',
                accent: '25 80% 60%',
                border: '39 44% 25%',
                input: '39 44% 25%',
                ring: '39 84% 62%',
                radius: '8px',
            },
            loader: {
                color: '#DAA520', // Gold
                height: 3,
                showShadow: true,
            },
            card: {
                headerClientColorFrom: '#D4AF37',
                headerClientColorTo: '#C09526',
                headerSupplierColorFrom: '#A0522D',
                headerSupplierColorTo: '#8B4513',
                headerBothColorFrom: '#D4AF37',
                headerBothColorTo: '#A0522D',
            }
        },
    },
    {
        id: 'oceanic-breeze',
        name: 'النسيم المحيطي',
        description: 'درجات من الأخضر البحري والأزرق السماوي.',
        config: {
            light: {
                background: '180 35% 96%', // Very light cyan
                foreground: '180 25% 20%',
                card: '0 0% 100%',
                primary: '170 80% 40%', // Teal
                primaryForeground: '0 0% 100%',
                secondary: '180 25% 92%',
                accent: '190 85% 55%', // Sky Blue
                border: '180 25% 88%',
                input: '180 25% 88%',
                ring: '170 80% 40%',
                radius: '16px',
            },
            dark: {
                background: '180 25% 10%',
                foreground: '180 35% 96%',
                card: '180 25% 15%',
                primary: '170 80% 50%',
                primaryForeground: '0 0% 100%',
                secondary: '180 25% 20%',
                accent: '190 85% 65%',
                border: '180 25% 25%',
                input: '180 25% 25%',
                ring: '170 80% 50%',
                radius: '16px',
            },
            loader: {
                color: '#20C997', // Teal
                height: 4,
                showShadow: false,
            },
            card: {
                headerClientColorFrom: 'hsl(170, 80%, 40%)',
                headerClientColorTo: 'hsl(190, 85%, 55%)',
                headerSupplierColorFrom: '#008B8B',
                headerSupplierColorTo: '#20B2AA',
                headerBothColorFrom: 'hsl(170, 80%, 40%)',
                headerBothColorTo: 'hsl(190, 85%, 55%)',
            }
        },
    },
    {
        id: 'ruby-royale',
        name: 'الياقوت الملكي',
        description: 'مزيج من الأحمر الياقوتي والرمادي الداكن.',
        config: {
            light: {
                background: '0 0% 98%',
                foreground: '0 0% 10%',
                card: '0 0% 100%',
                primary: '340 82% 52%', // Ruby Red
                primaryForeground: '0 0% 100%',
                secondary: '0 0% 95%',
                accent: '240 5% 50%', // Slate Gray
                border: '0 0% 90%',
                input: '0 0% 90%',
                ring: '340 82% 52%',
                radius: '4px',
            },
            dark: {
                background: '0 0% 10%',
                foreground: '0 0% 98%',
                card: '0 0% 15%',
                primary: '340 82% 62%',
                primaryForeground: '0 0% 100%',
                secondary: '0 0% 20%',
                accent: '240 5% 60%',
                border: '0 0% 25%',
                input: '0 0% 25%',
                ring: '340 82% 62%',
                radius: '4px',
            },
            loader: {
                color: '#E0115F', // Ruby Red
                height: 2,
                showShadow: false,
            },
            card: {
                headerClientColorFrom: 'hsl(340, 82%, 52%)',
                headerClientColorTo: 'hsl(340, 90%, 65%)',
                headerSupplierColorFrom: 'hsl(240, 5%, 50%)',
                headerSupplierColorTo: 'hsl(240, 5%, 65%)',
                headerBothColorFrom: 'hsl(340, 82%, 52%)',
                headerBothColorTo: 'hsl(240, 5%, 50%)',
            }
        },
    },
     {
        id: 'emerald-night',
        name: 'الزمرد الليلي',
        description: 'أخضر زمردي عميق مع تفاصيل ذهبية.',
        config: {
            light: {
                background: '145 25% 97%',
                foreground: '145 20% 15%',
                card: '0 0% 100%',
                primary: '145 63% 42%', // Emerald Green
                primaryForeground: '0 0% 100%',
                secondary: '145 15% 94%',
                accent: '45 74% 47%', // Gold Accent
                border: '145 15% 88%',
                input: '145 15% 88%',
                ring: '145 63% 42%',
                radius: '8px',
            },
            dark: {
                background: '145 20% 10%',
                foreground: '145 25% 97%',
                card: '145 20% 14%',
                primary: '145 63% 52%',
                primaryForeground: '0 0% 100%',
                secondary: '145 20% 18%',
                accent: '45 74% 57%',
                border: '145 20% 22%',
                input: '145 20% 22%',
                ring: '145 63% 52%',
                radius: '8px',
            },
            loader: {
                color: '#009B77', // Emerald
                height: 3,
                showShadow: true,
            },
             card: {
                headerClientColorFrom: 'hsl(145, 63%, 42%)',
                headerClientColorTo: 'hsl(145, 63%, 32%)',
                headerSupplierColorFrom: 'hsl(45, 74%, 47%)',
                headerSupplierColorTo: 'hsl(45, 74%, 37%)',
                headerBothColorFrom: 'hsl(145, 63%, 42%)',
                headerBothColorTo: 'hsl(45, 74%, 47%)',
            }
        },
    },
    {
        id: 'sakura-dream',
        name: 'حلم الساكورا',
        description: 'وردي هادئ مستوحى من زهور الكرز اليابانية.',
        config: {
            light: {
                background: '350 100% 98%',
                foreground: '350 20% 25%',
                card: '0 0% 100%',
                primary: '340 80% 75%',
                primaryForeground: '340 80% 15%',
                secondary: '350 50% 95%',
                accent: '330 75% 65%',
                border: '350 40% 90%',
                input: '350 40% 90%',
                ring: '340 80% 75%',
                radius: '10px',
            },
            dark: {
                background: '350 20% 12%',
                foreground: '350 100% 98%',
                card: '350 20% 16%',
                primary: '340 80% 65%',
                primaryForeground: '0 0% 100%',
                secondary: '350 20% 20%',
                accent: '330 75% 75%',
                border: '350 20% 25%',
                input: '350 20% 25%',
                ring: '340 80% 65%',
                radius: '10px',
            },
            loader: {
                color: '#FFB7C5', // Light Pink
                height: 3,
                showShadow: false,
            },
            card: {
                headerClientColorFrom: 'hsl(340, 80%, 75%)',
                headerClientColorTo: 'hsl(340, 80%, 85%)',
                headerSupplierColorFrom: 'hsl(330, 75%, 65%)',
                headerSupplierColorTo: 'hsl(330, 75%, 75%)',
                headerBothColorFrom: 'hsl(340, 80%, 75%)',
                headerBothColorTo: 'hsl(330, 75%, 65%)',
            }
        },
    },
    {
        id: 'slate-professional',
        name: 'الرمادي الاحترافي',
        description: 'تصميم احترافي بألوان رمادية محايدة.',
        config: {
            light: {
                background: '215 20% 97%',
                foreground: '215 28% 17%',
                card: '0 0% 100%',
                primary: '220 15% 45%', // Slate Gray
                primaryForeground: '0 0% 100%',
                secondary: '215 20% 92%',
                accent: '220 15% 65%',
                border: '215 20% 88%',
                input: '215 20% 88%',
                ring: '220 15% 45%',
                radius: '6px',
            },
            dark: {
                background: '220 15% 12%',
                foreground: '215 20% 97%',
                card: '220 15% 16%',
                primary: '220 15% 55%',
                primaryForeground: '0 0% 100%',
                secondary: '220 15% 20%',
                accent: '220 15% 75%',
                border: '220 15% 25%',
                input: '220 15% 25%',
                ring: '220 15% 55%',
                radius: '6px',
            },
            loader: {
                color: '#708090', // Slate Gray
                height: 3,
                showShadow: false,
            },
             card: {
                headerClientColorFrom: 'hsl(220, 15%, 45%)',
                headerClientColorTo: 'hsl(220, 15%, 55%)',
                headerSupplierColorFrom: 'hsl(220, 15%, 65%)',
                headerSupplierColorTo: 'hsl(220, 15%, 75%)',
                headerBothColorFrom: 'hsl(220, 15%, 45%)',
                headerBothColorTo: 'hsl(220, 15%, 65%)',
            }
        },
    },
    {
        id: 'cyberpunk-neon',
        name: 'النيون المستقبلي',
        description: 'ألوان زاهية وداكنة مستوحاة من عالم السايبربنك.',
        config: {
            light: { // Light mode is intentionally dark for this theme
                background: '240 10% 10%',
                foreground: '270 80% 90%',
                card: '240 10% 15%',
                primary: '290 100% 65%', // Magenta
                primaryForeground: '0 0% 100%',
                secondary: '240 10% 20%',
                accent: '180 100% 50%', // Cyan
                border: '240 10% 25%',
                input: '240 10% 25%',
                ring: '290 100% 65%',
                radius: '2px',
            },
            dark: {
                background: '240 10% 5%',
                foreground: '270 80% 95%',
                card: '240 10% 12%',
                primary: '290 100% 70%',
                primaryForeground: '0 0% 100%',
                secondary: '240 10% 18%',
                accent: '180 100% 55%',
                border: '240 10% 20%',
                input: '240 10% 20%',
                ring: '290 100% 70%',
                radius: '2px',
            },
            loader: {
                color: '#FF00FF', // Magenta
                height: 2,
                showShadow: true,
            },
            card: {
                headerClientColorFrom: 'hsl(290, 100%, 65%)',
                headerClientColorTo: 'hsl(180, 100%, 50%)',
                headerSupplierColorFrom: 'hsl(180, 100%, 50%)',
                headerSupplierColorTo: 'hsl(50, 100%, 50%)',
                headerBothColorFrom: 'hsl(290, 100%, 65%)',
                headerBothColorTo: 'hsl(50, 100%, 50%)',
            }
        },
    },
    {
        id: 'forest-whisper',
        name: 'همس الغابة',
        description: 'ألوان طبيعية هادئة من وحي الغابات.',
        config: {
            light: {
                background: '120 15% 98%',
                foreground: '120 25% 15%',
                card: '0 0% 100%',
                primary: '120 40% 45%', // Forest Green
                primaryForeground: '0 0% 100%',
                secondary: '120 10% 94%',
                accent: '90 35% 55%', // Moss Green
                border: '120 10% 88%',
                input: '120 10% 88%',
                ring: '120 40% 45%',
                radius: '12px',
            },
            dark: {
                background: '120 25% 8%',
                foreground: '120 15% 98%',
                card: '120 25% 12%',
                primary: '120 40% 55%',
                primaryForeground: '0 0% 100%',
                secondary: '120 25% 16%',
                accent: '90 35% 65%',
                border: '120 25% 20%',
                input: '120 25% 20%',
                ring: '120 40% 55%',
                radius: '12px',
            },
            loader: {
                color: '#556B2F', // Forest Green
                height: 3,
                showShadow: false,
            },
            card: {
                headerClientColorFrom: 'hsl(120, 40%, 45%)',
                headerClientColorTo: 'hsl(120, 40%, 35%)',
                headerSupplierColorFrom: 'hsl(90, 35%, 55%)',
                headerSupplierColorTo: 'hsl(90, 35%, 45%)',
                headerBothColorFrom: 'hsl(120, 40%, 45%)',
                headerBothColorTo: 'hsl(90, 35%, 55%)',
            }
        },
    },
    {
        id: 'amethyst-sky',
        name: 'سماء الجمشت',
        description: 'درجات من البنفسجي والأرجواني مستوحاة من سماء الغروب.',
        config: {
            light: {
                background: '270 50% 97%',
                foreground: '270 30% 20%',
                card: '0 0% 100%',
                primary: '270 70% 60%', // Amethyst Purple
                primaryForeground: '0 0% 100%',
                secondary: '270 40% 94%',
                accent: '300 75% 70%', // Light Magenta
                border: '270 40% 88%',
                input: '270 40% 88%',
                ring: '270 70% 60%',
                radius: '20px',
            },
            dark: {
                background: '270 30% 10%',
                foreground: '270 50% 97%',
                card: '270 30% 14%',
                primary: '270 70% 70%',
                primaryForeground: '0 0% 100%',
                secondary: '270 30% 18%',
                accent: '300 75% 80%',
                border: '270 30% 22%',
                input: '270 30% 22%',
                ring: '270 70% 70%',
                radius: '20px',
            },
            loader: {
                color: '#9966CC', // Amethyst
                height: 4,
                showShadow: true,
            },
             card: {
                headerClientColorFrom: 'hsl(270, 70%, 60%)',
                headerClientColorTo: 'hsl(270, 70%, 50%)',
                headerSupplierColorFrom: 'hsl(300, 75%, 70%)',
                headerSupplierColorTo: 'hsl(300, 75%, 60%)',
                headerBothColorFrom: 'hsl(270, 70%, 60%)',
                headerBothColorTo: 'hsl(300, 75%, 70%)',
            }
        },
    },
    {
        id: 'golden-sands',
        name: 'رمال ذهبية',
        description: 'تصميم فاخر بألوان الذهب والرمال.',
        config: {
          light: { background: '45 50% 95%', foreground: '35 30% 25%', card: '0 0% 100%', primary: '45 80% 55%', primaryForeground: '35 30% 15%', secondary: '45 40% 90%', accent: '30 70% 60%', border: '45 30% 85%', input: '45 30% 85%', ring: '45 80% 55%', radius: '10px' },
          dark: { background: '35 30% 10%', foreground: '45 50% 95%', card: '35 30% 15%', primary: '45 80% 65%', primaryForeground: '45 50% 95%', secondary: '35 30% 20%', accent: '30 70% 70%', border: '35 30% 25%', input: '35 30% 25%', ring: '45 80% 65%', radius: '10px' },
          loader: { color: '#E6B800', height: 3, showShadow: true },
          card: { headerClientColorFrom: 'hsl(45, 80%, 55%)', headerClientColorTo: 'hsl(30, 70%, 60%)', headerSupplierColorFrom: 'hsl(35, 30%, 40%)', headerSupplierColorTo: 'hsl(35, 30%, 30%)', headerBothColorFrom: 'hsl(45, 80%, 55%)', headerBothColorTo: 'hsl(35, 30%, 40%)' }
        }
    },
    {
        id: 'arctic-dawn',
        name: 'فجر القطب',
        description: 'تصميم نقي ومنعش بألوان زرقاء جليدية.',
        config: {
          light: { background: '200 100% 98%', foreground: '210 30% 20%', card: '0 0% 100%', primary: '190 80% 60%', primaryForeground: '210 30% 10%', secondary: '200 50% 95%', accent: '210 90% 70%', border: '200 40% 90%', input: '200 40% 90%', ring: '190 80% 60%', radius: '12px' },
          dark: { background: '210 30% 12%', foreground: '200 100% 98%', card: '210 30% 18%', primary: '190 80% 70%', primaryForeground: '200 100% 98%', secondary: '210 30% 22%', accent: '210 90% 80%', border: '210 30% 28%', input: '210 30% 28%', ring: '190 80% 70%', radius: '12px' },
          loader: { color: '#66D9EF', height: 3, showShadow: false },
          card: { headerClientColorFrom: 'hsl(190, 80%, 60%)', headerClientColorTo: 'hsl(210, 90%, 70%)', headerSupplierColorFrom: 'hsl(210, 30%, 50%)', headerSupplierColorTo: 'hsl(210, 30%, 40%)', headerBothColorFrom: 'hsl(190, 80%, 60%)', headerBothColorTo: 'hsl(210, 30%, 50%)' }
        }
    },
    {
        id: 'volcanic-ash',
        name: 'رماد بركاني',
        description: 'مظهر درامي بألوان داكنة مع لمسة من الأحمر الناري.',
        config: {
          light: { background: '0 0% 90%', foreground: '0 0% 10%', card: '0 0% 98%', primary: '0 85% 55%', primaryForeground: '0 0% 100%', secondary: '0 0% 85%', accent: '20 90% 55%', border: '0 0% 80%', input: '0 0% 80%', ring: '0 85% 55%', radius: '4px' },
          dark: { background: '0 0% 8%', foreground: '0 0% 90%', card: '0 0% 12%', primary: '0 85% 65%', primaryForeground: '0 0% 100%', secondary: '0 0% 18%', accent: '20 90% 65%', border: '0 0% 22%', input: '0 0% 22%', ring: '0 85% 65%', radius: '4px' },
          loader: { color: '#FF4500', height: 2, showShadow: true },
          card: { headerClientColorFrom: 'hsl(0, 85%, 55%)', headerClientColorTo: 'hsl(20, 90%, 55%)', headerSupplierColorFrom: 'hsl(0, 0%, 30%)', headerSupplierColorTo: 'hsl(0, 0%, 20%)', headerBothColorFrom: 'hsl(0, 85%, 55%)', headerBothColorTo: 'hsl(0, 0%, 30%)' }
        }
    },
    {
        id: 'royal-gold',
        name: 'الذهب الملكي',
        description: 'تصميم ملكي يجمع بين الأزرق العميق والبنفسجي مع لمسات ذهبية.',
        config: {
          light: { background: '240 20% 98%', foreground: '240 20% 15%', card: '0 0% 100%', primary: '250 60% 50%', primaryForeground: '0 0% 100%', secondary: '240 10% 95%', accent: '45 80% 50%', border: '240 10% 90%', input: '240 10% 90%', ring: '250 60% 50%', radius: '10px' },
          dark: { background: '240 20% 10%', foreground: '240 20% 98%', card: '240 20% 14%', primary: '250 60% 60%', primaryForeground: '0 0% 100%', secondary: '240 20% 18%', accent: '45 80% 60%', border: '240 20% 24%', input: '240 20% 24%', ring: '250 60% 60%', radius: '10px' },
          loader: { color: '#FFD700', height: 3, showShadow: true },
          card: { headerClientColorFrom: 'hsl(250, 60%, 50%)', headerClientColorTo: 'hsl(45, 80%, 50%)', headerSupplierColorFrom: 'hsl(45, 80%, 50%)', headerSupplierColorTo: 'hsl(45, 90%, 60%)', headerBothColorFrom: 'hsl(250, 60%, 50%)', headerBothColorTo: 'hsl(45, 80%, 50%)' }
        }
    },
    {
        id: 'minty-fresh',
        name: 'نعناع منعش',
        description: 'تصميم خفيف ومنعش بألوان النعناع الأخضر والرمادي.',
        config: {
          light: { background: '150 40% 98%', foreground: '150 20% 20%', card: '0 0% 100%', primary: '150 70% 45%', primaryForeground: '0 0% 100%', secondary: '150 30% 95%', accent: '170 60% 50%', border: '150 30% 90%', input: '150 30% 90%', ring: '150 70% 45%', radius: '12px' },
          dark: { background: '150 20% 10%', foreground: '150 40% 98%', card: '150 20% 15%', primary: '150 70% 55%', primaryForeground: '0 0% 100%', secondary: '150 20% 20%', accent: '170 60% 60%', border: '150 20% 25%', input: '150 20% 25%', ring: '150 70% 55%', radius: '12px' },
          loader: { color: '#3EB489', height: 3, showShadow: false },
          card: { headerClientColorFrom: 'hsl(150, 70%, 45%)', headerClientColorTo: 'hsl(170, 60%, 50%)', headerSupplierColorFrom: 'hsl(150, 20%, 60%)', headerSupplierColorTo: 'hsl(150, 20%, 50%)', headerBothColorFrom: 'hsl(150, 70%, 45%)', headerBothColorTo: 'hsl(150, 20%, 60%)' }
        }
    },
    {
        id: 'mocha-cafe',
        name: 'مقهى الموكا',
        description: 'ألوان دافئة ومريحة مستوحاة من القهوة.',
        config: {
          light: { background: '30 20% 96%', foreground: '30 40% 20%', card: '0 0% 100%', primary: '30 50% 40%', primaryForeground: '0 0% 100%', secondary: '30 15% 92%', accent: '25 60% 50%', border: '30 15% 88%', input: '30 15% 88%', ring: '30 50% 40%', radius: '8px' },
          dark: { background: '30 40% 10%', foreground: '30 20% 96%', card: '30 40% 15%', primary: '30 50% 50%', primaryForeground: '0 0% 100%', secondary: '30 40% 20%', accent: '25 60% 60%', border: '30 40% 25%', input: '30 40% 25%', ring: '30 50% 50%', radius: '8px' },
          loader: { color: '#A56A44', height: 3, showShadow: true },
          card: { headerClientColorFrom: 'hsl(30, 50%, 40%)', headerClientColorTo: 'hsl(25, 60%, 50%)', headerSupplierColorFrom: 'hsl(30, 20%, 50%)', headerSupplierColorTo: 'hsl(30, 20%, 40%)', headerBothColorFrom: 'hsl(30, 50%, 40%)', headerBothColorTo: 'hsl(30, 20%, 50%)' }
        }
    },
    {
        id: 'sunset-glow',
        name: 'وهج الغروب',
        description: 'ألوان حيوية من تدرجات غروب الشمس.',
        config: {
          light: { background: '25 100% 97%', foreground: '15 40% 20%', card: '0 0% 100%', primary: '15 90% 60%', primaryForeground: '0 0% 100%', secondary: '25 80% 95%', accent: '340 90% 70%', border: '25 70% 90%', input: '25 70% 90%', ring: '15 90% 60%', radius: '16px' },
          dark: { background: '15 40% 10%', foreground: '25 100% 97%', card: '15 40% 15%', primary: '15 90% 70%', primaryForeground: '0 0% 100%', secondary: '15 40% 20%', accent: '340 90% 80%', border: '15 40% 25%', input: '15 40% 25%', ring: '15 90% 70%', radius: '16px' },
          loader: { color: '#FF8C69', height: 4, showShadow: true },
          card: { headerClientColorFrom: 'hsl(15, 90%, 60%)', headerClientColorTo: 'hsl(340, 90%, 70%)', headerSupplierColorFrom: 'hsl(340, 50%, 60%)', headerSupplierColorTo: 'hsl(340, 50%, 50%)', headerBothColorFrom: 'hsl(15, 90%, 60%)', headerBothColorTo: 'hsl(340, 50%, 60%)' }
        }
    },
    {
        id: 'lavender-fields',
        name: 'حقول الخزامى',
        description: 'تصميم هادئ وأنيق بألوان الخزامى والبنفسجي الفاتح.',
        config: {
          light: { background: '255 60% 98%', foreground: '255 30% 25%', card: '0 0% 100%', primary: '255 70% 65%', primaryForeground: '0 0% 100%', secondary: '255 50% 95%', accent: '280 60% 70%', border: '255 40% 90%', input: '255 40% 90%', ring: '255 70% 65%', radius: '12px' },
          dark: { background: '255 30% 12%', foreground: '255 60% 98%', card: '255 30% 18%', primary: '255 70% 75%', primaryForeground: '0 0% 100%', secondary: '255 30% 22%', accent: '280 60% 80%', border: '255 30% 28%', input: '255 30% 28%', ring: '255 70% 75%', radius: '12px' },
          loader: { color: '#B2A9DF', height: 3, showShadow: false },
          card: { headerClientColorFrom: 'hsl(255, 70%, 65%)', headerClientColorTo: 'hsl(280, 60%, 70%)', headerSupplierColorFrom: 'hsl(255, 30%, 60%)', headerSupplierColorTo: 'hsl(255, 30%, 50%)', headerBothColorFrom: 'hsl(255, 70%, 65%)', headerBothColorTo: 'hsl(255, 30%, 60%)' }
        }
    },
    {
        id: 'industrial-chic',
        name: 'أناقة صناعية',
        description: 'تصميم حديث يجمع بين الخرسانة والمعادن.',
        config: {
          light: { background: '210 20% 94%', foreground: '210 20% 10%', card: '0 0% 100%', primary: '210 15% 35%', primaryForeground: '0 0% 100%', secondary: '210 15% 90%', accent: '200 20% 50%', border: '210 15% 85%', input: '210 15% 85%', ring: '210 15% 35%', radius: '0px' },
          dark: { background: '210 20% 10%', foreground: '210 20% 94%', card: '210 20% 15%', primary: '210 15% 45%', primaryForeground: '0 0% 100%', secondary: '210 20% 20%', accent: '200 20% 60%', border: '210 20% 25%', input: '210 20% 25%', ring: '210 15% 45%', radius: '0px' },
          loader: { color: '#526D82', height: 4, showShadow: false },
          card: { headerClientColorFrom: 'hsl(210, 15%, 35%)', headerClientColorTo: 'hsl(200, 20%, 50%)', headerSupplierColorFrom: 'hsl(210, 10%, 40%)', headerSupplierColorTo: 'hsl(210, 10%, 30%)', headerBothColorFrom: 'hsl(210, 15%, 35%)', headerBothColorTo: 'hsl(210, 10%, 40%)' }
        }
    },
    {
        id: 'crimson-black',
        name: 'قرمزي وأسود',
        description: 'تصميم جريء وقوي بألوان الأسود والأحمر القرمزي.',
        config: {
          light: { background: '0 0% 96%', foreground: '0 0% 5%', card: '0 0% 100%', primary: '350 80% 50%', primaryForeground: '0 0% 100%', secondary: '0 0% 92%', accent: '0 0% 30%', border: '0 0% 88%', input: '0 0% 88%', ring: '350 80% 50%', radius: '6px' },
          dark: { background: '0 0% 8%', foreground: '0 0% 96%', card: '0 0% 12%', primary: '350 80% 60%', primaryForeground: '0 0% 100%', secondary: '0 0% 18%', accent: '0 0% 40%', border: '0 0% 22%', input: '0 0% 22%', ring: '350 80% 60%', radius: '6px' },
          loader: { color: '#DC143C', height: 2, showShadow: true },
          card: { headerClientColorFrom: 'hsl(350, 80%, 50%)', headerClientColorTo: 'hsl(0, 0%, 30%)', headerSupplierColorFrom: 'hsl(0, 0%, 30%)', headerSupplierColorTo: 'hsl(0, 0%, 20%)', headerBothColorFrom: 'hsl(350, 80%, 50%)', headerBothColorTo: 'hsl(0, 0%, 30%)' }
        }
    }
];


export const getThemeFromId = (themeId: string): ThemeSettings => {
    return THEMES.find(t => t.id === themeId) || THEMES[0];
};

