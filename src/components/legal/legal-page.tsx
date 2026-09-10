import { Container } from '@/components/ui/container';
import { fr } from '@/content/fr';

interface LegalSection {
  heading: string;
  paragraphs?: readonly string[];
  list?: readonly string[];
}

export function LegalPage({
  title,
  sections,
}: {
  title: string;
  sections: readonly LegalSection[];
}) {
  return (
    <Container className="max-w-3xl py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>

      <p className="border-accent bg-accent-foreground text-foreground mt-6 rounded-md border px-4 py-3 text-sm">
        {fr.pages.legal.disclaimer}
      </p>

      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold tracking-tight">{section.heading}</h2>
            {section.list && (
              <ul className="text-muted mt-2 list-disc space-y-1 pl-5 text-sm">
                {section.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="text-muted mt-2 text-sm">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </Container>
  );
}
