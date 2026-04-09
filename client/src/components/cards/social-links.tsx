import { CirclePlus, Camera, Cloud, Globe } from "@/lib/icons"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"

const links = [
  { icon: CirclePlus, label: "Spotify Artist URL", id: "spotify-url", value: "spotify.com/artist/3j...2k" },
  { icon: Camera, label: "Instagram Handle", id: "instagram-handle", value: "@julianduryea_music" },
  { icon: Cloud, label: "SoundCloud URL", id: "soundcloud-url", placeholder: "soundcloud.com/username" },
  { icon: Globe, label: "Website", id: "website-url", placeholder: "https://yoursite.com" },
]

export function SocialLinks() {
  return (
    <Card>
      <CardHeader><CardTitle>Social Links</CardTitle></CardHeader>
      <CardContent>
        <FieldGroup>
          {links.map((link) => (
            <Field key={link.id}>
              <FieldLabel htmlFor={link.id}>{link.label}</FieldLabel>
              <InputGroup>
                <InputGroupAddon><link.icon /></InputGroupAddon>
                <InputGroupInput id={link.id} defaultValue={link.value} placeholder={link.placeholder} />
              </InputGroup>
            </Field>
          ))}
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="secondary">Discard</Button>
        <Button>Save Changes</Button>
      </CardFooter>
    </Card>
  )
}
