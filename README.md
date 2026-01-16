**ComfyJazz** Play easy-listening comfy computer-generated Twitch-integrated Jazz music!

# ComfyJazz
The Comfiest Computer-Generated Twitch-Integrated Jazz Music!

This is a fork of [Instafluff's ComfyJazz](https://github.com/instafluff/ComfyJazz). Notes are played randomly and for each chat message on your channel!

Based on [Google's Launch Night In](https://launchnightin.withgoogle.com/en/) music toy.

## Instructions ##

Add this as a Browser Source and replace `yourchannel` with your Twitch username!

[https://jtatum.github.io/ComfyJazz/?channel=yourchannel](https://jtatum.github.io/ComfyJazz/?channel=yourchannel)

```
For example:
https://jtatum.github.io/ComfyJazz/?channel=julieee22
```

### URL Parameters ###

- `channel` - Twitch channel to connect to (plays notes on chat messages)
- `instrument` - Instrument to use: piano, sax, clarinet, vibraphone, harp, guitar, guzheng, twinkle (default: piano)
- `volume` - Volume level from 0 to 1 (default: 1)
- `autostart` - Set to `true` to start automatically (recommended for OBS browser sources)

### OBS Setup ###

Add as a Browser Source with `autostart=true`:
```
https://jtatum.github.io/ComfyJazz/?channel=yourchannel&autostart=true
```

If audio doesn't start, right-click the source → "Interact" → click anywhere to start.

You can combine parameters:
```
https://jtatum.github.io/ComfyJazz/?channel=julieee22&instrument=vibraphone&volume=0.5
```

## Credits ##
Thank you too all the participants of this project!

**Instafluff, Instafriend, MrRayKoma, That_MS_Gamer, NEvVvR, Shaezonai, BungalowGlow, aRandomTim, icecreamtango, jellyw00t, JessaTheBesta, marc2067, PomoTheDog, PortaalGaming, walpolea, Wasabi_Cheetah, JupiterZky, shineslove, X8Y8Z8X, BuilderArgus, Ellenary, neniltheelf, its_indy_, TgMrP1, huggable_hug, narendev, codesillystuff, Kurokirisu, Caffidget, Sparkie108, Munin__, Krisc119, TheRukus, AmericanVikingJohn, MaartenVanStam, greybush1982, paranoidandroidiot, claireunaware, gohaku88, DutchGamer46, KappaMangos, JeanValjean80, LinusvDev, LilyHazel, DreamGardenPanda, bigdoggy101, TheBookSnail, thatgirllee92, simrose4u, Markee_68Q, WazabyDev, EssieLessie, livecoding, DevMerlin, Lasamat, corporatistic, Grallih, AnnaCodes, cheppy4444dude, shadowcraft5, sparky_pugwash, holloway87, Kilo_Predator, cryogen_sw, TripleMused, Bjwhite211, Jah2369, EverydayGamerM, AllanJLA, Maayainsane, kbgagt, rota22_, Amarin_, TheArtOfKimmy, Rosuav, fikapaus, MizeKa, emzie94, snake1987, rmilesi009, GiRLaZo, kajrov, Simpathey, Beldathas, Cuicui_off, maxi_moff_, RadzikART, rurutu, VivYaong, lucsflipflop, jeckle, Netjamjr, kevinsjoberg, eateren, TaleLearnCode, Agentdave7, masaki_tty, Chumblez_, wabes1, SullyGnome, TheNutellaOreo, BrewAndTheCrew, Laks_1, iam_vikas, mycatlikestuna, HellGreen, tiana88dreamer, creador_de_mundos, Lawralee, chewitdude, FuriousFur, Ogaithus, microbesMA, Wietlol, Schkullie, reapersrealmsgaming, vikingcoder, julieee22, n1p2, A_Ninja_For_Jesus_Bruh, MurdocTurner, mikaiala**
