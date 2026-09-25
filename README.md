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
- `song` - Background song to play: comfy (default: comfy)
- `volume` - Volume level from 0 to 1 (default: 1)

You can combine parameters:
```
https://jtatum.github.io/ComfyJazz/?channel=julieee22&instrument=vibraphone&volume=0.5
```

### Starting Up ###

OBS browser sources start playing on their own. (URLs with `autostart=true` from older instructions still work, it just isn't needed anymore.)

In a regular browser you'll get a "Click to start" screen instead, because browsers don't let a page make sound until you've clicked on it. To skip that in Chrome, click the site controls icon next to the address → Site settings → set Sound to Allow.

## Running Locally ##

```
npm install
node index.js
```

Then open [http://localhost:8901](http://localhost:8901). `npm install` also copies the Howler and comfy.js libraries the page loads into `web/vendor/`, and `node index.js` refreshes them every time it starts.

## Credits ##
Thank you too all the participants of this project!

**Instafluff, Instafriend, MrRayKoma, That_MS_Gamer, NEvVvR, Shaezonai, BungalowGlow, aRandomTim, icecreamtango, jellyw00t, JessaTheBesta, marc2067, PomoTheDog, PortaalGaming, walpolea, Wasabi_Cheetah, JupiterZky, shineslove, X8Y8Z8X, BuilderArgus, Ellenary, neniltheelf, its_indy_, TgMrP1, huggable_hug, narendev, codesillystuff, Kurokirisu, Caffidget, Sparkie108, Munin__, Krisc119, TheRukus, AmericanVikingJohn, MaartenVanStam, greybush1982, paranoidandroidiot, claireunaware, gohaku88, DutchGamer46, KappaMangos, JeanValjean80, LinusvDev, LilyHazel, DreamGardenPanda, bigdoggy101, TheBookSnail, thatgirllee92, simrose4u, Markee_68Q, WazabyDev, EssieLessie, livecoding, DevMerlin, Lasamat, corporatistic, Grallih, AnnaCodes, cheppy4444dude, shadowcraft5, sparky_pugwash, holloway87, Kilo_Predator, cryogen_sw, TripleMused, Bjwhite211, Jah2369, EverydayGamerM, AllanJLA, Maayainsane, kbgagt, rota22_, Amarin_, TheArtOfKimmy, Rosuav, fikapaus, MizeKa, emzie94, snake1987, rmilesi009, GiRLaZo, kajrov, Simpathey, Beldathas, Cuicui_off, maxi_moff_, RadzikART, rurutu, VivYaong, lucsflipflop, jeckle, Netjamjr, kevinsjoberg, eateren, TaleLearnCode, Agentdave7, masaki_tty, Chumblez_, wabes1, SullyGnome, TheNutellaOreo, BrewAndTheCrew, Laks_1, iam_vikas, mycatlikestuna, HellGreen, tiana88dreamer, creador_de_mundos, Lawralee, chewitdude, FuriousFur, Ogaithus, microbesMA, Wietlol, Schkullie, reapersrealmsgaming, vikingcoder, julieee22, n1p2, A_Ninja_For_Jesus_Bruh, MurdocTurner, mikaiala**
