/**
 * Workspace codename generator — `<adjective>-elf-<3-digit number>`.
 * e.g. swift-elf-041, quiet-elf-907, brave-elf-204.
 *
 * The middle word is always "elf" (brand). Adjectives are short, friendly,
 * pronounceable, and brand-safe. The numeric suffix gives ~999 unique
 * codenames per adjective; with 80 adjectives, that's ~80k possibilities
 * before any DB collision check is needed.
 *
 * Caller is responsible for retrying on uniqueness conflicts.
 */

const adjectives = [
  "swift",
  "quiet",
  "brave",
  "calm",
  "bold",
  "gentle",
  "merry",
  "noble",
  "humble",
  "lively",
  "mellow",
  "sunny",
  "frosty",
  "amber",
  "silver",
  "violet",
  "scarlet",
  "indigo",
  "olive",
  "rusty",
  "cobalt",
  "tawny",
  "pearl",
  "rose",
  "lemon",
  "honey",
  "spruce",
  "willow",
  "cedar",
  "fern",
  "moss",
  "thistle",
  "harbor",
  "meadow",
  "valley",
  "river",
  "summit",
  "drift",
  "ember",
  "glade",
  "haven",
  "crest",
  "north",
  "south",
  "east",
  "west",
  "morning",
  "twilight",
  "lantern",
  "compass",
  "anchor",
  "kite",
  "comet",
  "nimbus",
  "halcyon",
  "dapper",
  "earnest",
  "tidy",
  "agile",
  "ample",
  "candid",
  "deft",
  "elegant",
  "fervent",
  "graceful",
  "hearty",
  "intent",
  "jovial",
  "keen",
  "lithe",
  "nimble",
  "patient",
  "spry",
  "trusty",
  "vivid",
  "winsome",
  "zesty",
  "quill",
  "pebble",
  "echo"
];

export function generateCodename(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const n = Math.floor(Math.random() * 999) + 1; // 1..999
  return `${adjective}-elf-${String(n).padStart(3, "0")}`;
}

/**
 * Returns the first codename whose `isFree(c)` resolves to true.
 * Bounded retries — throws after `maxAttempts` so we never spin forever.
 */
export async function generateUniqueCodename(
  isFree: (codename: string) => Promise<boolean>,
  maxAttempts = 16
): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = generateCodename();
    if (await isFree(candidate)) return candidate;
  }
  throw new Error(
    `generateUniqueCodename: no free codename after ${maxAttempts} attempts`
  );
}
