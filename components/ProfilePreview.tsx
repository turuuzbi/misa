import { isValidHttpsUrl, type Profile } from "@/lib/profile";

export function ProfilePreview({ profile }: { profile: Profile }) {
  const displayName = profile.displayName.trim();
  const bio = profile.bio.trim();
  const linkLabel = profile.link.label.trim();
  const linkUrl = profile.link.url.trim();
  const linkText = linkLabel || linkUrl || "Your link";

  return (
    <section aria-labelledby="preview-heading" className="md:sticky md:top-6">
      <h2 id="preview-heading" className="preview-tag">
        Preview
      </h2>
      <article className="character-card">
        <div className="character-card-banner">
          <span aria-hidden="true" className="menacing-sound-effect character-card-sound-effect">
            ゴゴゴ
          </span>
          <p className="character-card-name">
            {displayName || <span className="character-card-name-placeholder">Your name</span>}
          </p>
        </div>

        <div className="p-5">
          {bio && <p className="character-card-bio">{bio}</p>}
          <div className="mt-5">
            {isValidHttpsUrl(linkUrl) ? (
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="character-card-link"
              >
                {linkText}
              </a>
            ) : (
              <p className="character-card-link-inactive">
                <span className="block font-bold">{linkText}</span>
                <span className="text-sm">
                  Link inactive until the URL is a valid https:// address.
                </span>
              </p>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}
