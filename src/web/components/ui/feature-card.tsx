type Props = {
  icon?: React.ReactNode
  title: string
  description: string
  image?: string
  href?: string
}

export default function FeatureCard({ icon, title, description, image, href }: Props) {
  const descId = `fc-desc-${title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')}`
  const containerProps = href
    ? { as: 'a' as const, role: undefined, tabIndex: undefined, ariaLabel: title }
    : { as: 'div' as const, role: 'article' as const, tabIndex: 0, ariaLabel: title }

  const ContainerTag = containerProps.as

  return (
    <ContainerTag
      className="ui-card ui-pressable feature-card"
      {...(href ? { href } : {})}
      role={(containerProps.role as any) || undefined}
      tabIndex={(containerProps.tabIndex as any) || undefined}
      aria-label={containerProps.ariaLabel}
      aria-describedby={descId}
    >
      {image ? (
        <figure className="feature-card-media">
          <img
            className="ui-image-premium"
            src={image}
            alt={title}
            loading="lazy"
            decoding="async"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            width={800}
            height={450}
          />
        </figure>
      ) : null}
      <h3 className="ui-h3 feature-card-title">
        {icon ? <span className="feature-card-icon">{icon}</span> : null}
        {title}
      </h3>
      <p id={descId} className="ui-text ui-muted feature-card-desc">{description}</p>
    </ContainerTag>
  )
}