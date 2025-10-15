import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <Link href="/qr-create" className={'bg-blue-500'}>qr-create</Link>
      <Link href="/qr-scan" className={'bg-green-500'}>qr-scan</Link>
    </div>
  );
}
