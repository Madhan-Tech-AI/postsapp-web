import React from 'react'
import type { Metadata } from 'next'

interface StaticPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: StaticPageProps): Promise<Metadata> {
  const { locale } = await params
  return {
    title: locale === 'ta' ? 'எங்களை பற்றி — PostsApp' : 'About Us — PostsApp',
    description: 'Learn about PostsApp and our commitment to truthful bilingual journalism.',
    alternates: {
      canonical: `/${locale}/about`,
    },
  }
}

export default async function AboutPage({ params }: StaticPageProps) {
  const { locale } = await params
  const isTa = locale === 'ta'

  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">
          {isTa ? 'எங்களை பற்றி' : 'About PostsApp'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isTa ? 'உண்மை • துல்லியம் • நடுநிலை' : 'Truth • Accuracy • Impartiality'}
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded text-xs text-amber-800 dark:text-amber-300">
        <em>[Pending legal review]</em> — The following editorial and institutional statements are subject to final editorial board approval.
      </div>

      <div className="prose dark:prose-invert text-sm leading-relaxed space-y-4">
        <p>
          {isTa
            ? 'PostsApp என்பது ஆங்கிலம் மற்றும் தமிழில் இயங்கும் ஒரு முதன்மையான டிஜிட்டல் செய்தி தளமாகும். வாசகர்களுக்கு துல்லியமான, பக்கச்சார்பற்ற மற்றும் சமகால முக்கியத்துவம் வாய்ந்த செய்திகளை வழங்குவதே எங்கள் முதன்மை நோக்கம்.'
            : 'PostsApp is a premier bilingual digital news publishing platform serving readers in English and Tamil. Our mission is to deliver rigorous, verified, and impartial reporting across national, international, technology, business, and cultural spheres.'}
        </p>

        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          {isTa ? 'எங்கள் தலையங்கக் கொள்கை' : 'Our Editorial Standards'}
        </h3>
        <p>
          {isTa
            ? 'அனைத்து செய்திகளும் இரண்டு ஆதாரங்களுடன் சரிபார்க்கப்பட்ட பின்னரே வெளியிடப்படுகின்றன. செய்தி ஆசிரியர்கள் மற்றும் நிருபர்கள் கடுமையான தொழில்முறை நெறிமுறைகளைப் பின்பற்றுகின்றனர்.'
            : 'All reporting adheres to strict verification protocols. Every factual assertion is validated prior to publication. Instant corrections and transparent audit logging are foundational to our editorial accountability.'}
        </p>

        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          {isTa ? 'இருமொழி சமநிலை' : 'Bilingual Journalism'}
        </h3>
        <p>
          {isTa
            ? 'ஆங்கிலம் மற்றும் தமிழ் ஆகிய இரு மொழிகளிலும் சமமான முக்கியத்துவத்துடன் செய்திகள் உருவாக்கப்படுகின்றன. இயந்திர மொழிபெயர்ப்புகளைத் தவிர்த்து, மனித சிந்தனையுடன் கூடிய ஆழமான கட்டுரைகள் வழங்கப்படுகின்றன.'
            : 'We treat both English and Tamil editions as first-class journalistic products. Each language version maintains its own dedicated editorial identity, nuance, and cultural context.'}
        </p>
      </div>
    </main>
  )
}
