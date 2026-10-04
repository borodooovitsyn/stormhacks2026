// One landing section: text beside one proof object. `flip` puts the object on
// the left at lg so the three sections don't repeat the same composition.
export function Stop({
  id,
  title,
  body,
  actions,
  object,
  flip = false,
}: {
  id: string;
  title: string;
  body: string;
  actions: React.ReactNode;
  object: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <section
      id={id}
      className="grid scroll-mt-28 items-center gap-10 border-t border-border py-16 sm:py-24 lg:grid-cols-2 lg:gap-16"
    >
      <div className={flip ? "lg:order-2" : ""}>
        <h2 className="max-w-md text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
        <p className="mt-4 max-w-md text-muted">{body}</p>
        <div className="mt-7 flex flex-wrap gap-3">{actions}</div>
      </div>
      <div className={flip ? "lg:order-1" : ""}>{object}</div>
    </section>
  );
}
