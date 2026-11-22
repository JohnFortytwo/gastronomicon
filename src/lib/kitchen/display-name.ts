const NAME_PATTERN = /^[0-9A-Za-zÁČĎÉĚÍŇÓŘŠŤÚŮÝŽáčďéěíňóřšťúůýž_ ]+$/

export function normalizeDisplayName(value: string) {
  return value.trim().replace(/ +/g, " ")
}

export function displayNameError(name: string) {
  if (name.length < 2 || name.length > 24) {
    return "Jméno musí mít 2 až 24 znaků."
  }
  if (!NAME_PATTERN.test(name)) {
    return "Jméno může obsahovat jen písmena, číslice, mezeru a podtržítko."
  }
  return null
}
