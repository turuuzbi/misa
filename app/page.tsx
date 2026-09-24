import { ProfileEditor } from "@/components/ProfileEditor";

export default function ProfileEditorPage() {
  return (
    <div className="relative min-h-screen overflow-clip">
      <span aria-hidden="true" className="menacing-sound-effect page-sound-effect-top">
        ゴゴゴゴ
      </span>
      <span aria-hidden="true" className="menacing-sound-effect page-sound-effect-bottom">
        ゴゴゴ
      </span>

      <main className="relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-10">
          <h1 className="comic-title">Edit your profile</h1>
          <p className="narration-box mt-6 max-w-xl">
            The preview updates as you type. Press Save to store your changes on
            the server.
          </p>
        </header>
        <ProfileEditor />
      </main>
    </div>
  );
}
