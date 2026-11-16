import {setupStartingPointPreviews} from './setup-previews.js?v=studio-2';
import {setupStudioUI} from './studio-ui.js?v=artboard-24';
import {mergeSetup} from './setup-state.js?v=studio-2';
import {createHistory} from './history.js?v=undo-56';
import {setupFieldOverlay} from './field-overlay.js?v=selection-60';
import {newField,cleanFields} from './effect-fields.js?v=radial-core-62';
import {createFieldsPanel} from './fields-panel.js?v=sessions-63';
import {organizePanel} from './organize-panel.js?v=pulse-fade-54';
import {setupSourceTransform} from './source-transform.js?v=selection-60';
import {fitOpticalSetup} from './optical-fit.js?v=geometry-12';
import {setups} from './setups.js?v=studio-2';
import {LightEngine} from './engine.js?v=radial-core-62';
import {makeSourceField,sanitiseSVG} from './geometry.js?v=trim-42';
import {exportDimensions,pngFromPixels,renderSequence,renderVideo,videoFormat,canEncodeFrames,makeZip,yieldFrame} from './exports.js?v=export-fix-5';
import {blobDataURL,saveFile} from './save-file.js?v=export-fix-5';
import {setupWorkspace} from './workspace.js?v=artboard-24';
import {setupLookPicker} from './look-picker.js?v=zoom-looks-6';

const $=id=>document.getElementById(id);
organizePanel();
const presets={
 'trim-ice':{stops:[['#f1fbff',0],['#a7ddff',.18],['#3c83e8',.43],['#133a88',.7],['#050b20',1]],background:'#05070b',gradientType:'linear',gradientAngle:0},
 'blue-mix-10':{stops:[['#022dbc',0],['#4485f0',.09],['#0754ed',.2],['#091a91',.31],['#307bff',.42],['#9bcfff',.53],['#174fd9',.64],['#071b76',.76],['#477ef5',.88],['#022dbc',1]],background:'#ffffff',gradientType:'angular',gradientAngle:45},
 'optical-sunset':{stops:[['#07103a',0],['#3020e5',.24],['#9a40db',.52],['#dc72ad',.73],['#ffb50b',1]],background:'#ffb50b',gradientAngle:90},
 'optical-prism':{stops:[['#ff4b98',0],['#ffb32e',.25],['#f2e8a0',.5],['#8591ff',.76],['#142a39',1]],background:'#142a39',gradientAngle:90},
 'optical-blue':{stops:[['#f3edcd',0],['#e577c7',.25],['#5c92ff',.55],['#1530b2',.78],['#03091b',1]],background:'#03091b',gradientAngle:90},
 'ps-blue-white':{stops:[['#022dbc',0],['#0543e6',.5],['#0543e6',1]],background:'#ffffff',gradientAngle:90},
 'ps-blue-black':{stops:[['#022dbc',0],['#0543e6',.55],['#4485f0',1]],background:'#000000',gradientAngle:90},
 'ps-blue-mist':{stops:[['#022dbc',0],['#0543e6',.65],['#4485f0',1]],background:'#e6eaf3',gradientAngle:45},
 'ps-cyan':{stops:[['#022dbc',0],['#0543e6',.4],['#0543e6',.8],['#5fc4fb',.86],['#bde7fd',.94],['#022dbc',1]],background:'#ffffff',gradientType:'angular',gradientAngle:45},
 'ps-lime':{stops:[['#022dbc',0],['#0543e6',.4],['#0543e6',.8],['#ebeb45',.86],['#e8ff58',.94],['#022dbc',1]],background:'#ffffff',gradientType:'angular',gradientAngle:45},
 'ps-mint':{stops:[['#022dbc',0],['#0543e6',.4],['#0543e6',.8],['#20baa9',.86],['#92f6d6',.94],['#022dbc',1]],background:'#ffffff',gradientType:'angular',gradientAngle:45},
 'ps-magenta':{stops:[['#022dbc',0],['#0543e6',.4],['#0543e6',.8],['#fc1cba',.86],['#fc6aec',.94],['#022dbc',1]],background:'#ffffff',gradientType:'angular',gradientAngle:45},
 'ps-coral':{stops:[['#022dbc',0],['#0543e6',.4],['#0543e6',.8],['#fc6227',.86],['#fd9a31',.94],['#022dbc',1]],background:'#ffffff',gradientType:'angular',gradientAngle:45},
 'ps-violet':{stops:[['#022dbc',0],['#0543e6',.4],['#0543e6',.8],['#7c13f7',.86],['#b631f7',.94],['#022dbc',1]],background:'#ffffff',gradientType:'angular',gradientAngle:45},
 'ps-spectrum':{stops:[['#022dbc',0],['#0543e6',.4],['#0543e6',.8],['#5fc4fb',.84],['#e8ff58',.89],['#fc1cba',.94],['#7c13f7',.98],['#022dbc',1]],background:'#ffffff',gradientType:'angular',gradientAngle:45},
 spectral:{stops:[['#234cff',0],['#9c43ff',.34],['#ff7cbe',.60],['#fff064',.82],['#a8f6ff',1]],background:'#070916',gradientAngle:90,turbulence:.24,eddySize:.54,swirl:.55,viscosity:.32,flowSpeed:.13,glowStrength:1.25,glowRadius:.35,lifetime:5.5},
 molten:{stops:[['#95234d',0],['#f25938',.38],['#ffa634',.70],['#fff0af',1]],background:'#200e22',gradientAngle:70,turbulence:.16,eddySize:.68,swirl:.34,viscosity:.68,flowSpeed:.08,glowStrength:1.1,glowRadius:.45,lifetime:7},
 aurora:{stops:[['#2e22ef',0],['#3c86f1',.44],['#b9f4ff',.76],['#eb99ce',1]],background:'#050f24',gradientAngle:30,turbulence:.28,eddySize:.78,swirl:.46,viscosity:.22,flowSpeed:.14,glowStrength:1.4,glowRadius:.42,lifetime:6},
 pearl:{stops:[['#6373e8',0],['#de9fd9',.35],['#ffcb7c',.7],['#d1fff3',1]],background:'#303337',gradientAngle:90,turbulence:.12,eddySize:.70,swirl:.28,viscosity:.55,flowSpeed:.07,glowStrength:.95,glowRadius:.32,lifetime:6.5},
 violet:{stops:[['#192cdc',0],['#913cff',.35],['#ff4fbe',.70],['#b39dff',1]],background:'#110724',gradientAngle:0,turbulence:.35,eddySize:.4,swirl:.72,viscosity:.18,flowSpeed:.16,glowStrength:1.3,glowRadius:.28,lifetime:4}
};
const brandMotion={turbulence:.18,eddySize:.68,swirl:.36,viscosity:.42,flowSpeed:.1,glowStrength:1.15,glowRadius:.38,lifetime:6,exposure:1.05,emission:2.1,emissionWidth:.009,rim:0,shapeFill:0,pulse:.03,grain:.06,reach:.55,falloff:1.8};
const defaults={
 trimReveal:'none',trimDuration:4,trimEnabled:false,trimIn:0,trimOut:100,trimOffset:0,trimAnimate:false,trimVelocity:45,trimFeather:1,trimStyle:'shape',trimWidth:.005,tipMode:'off',tipAdherence:0,tipFanStart:0,tipInside:.2,tipOutside:.3,tipLength:.3,tipStrength:1.5,tipSoftness:.5,tipOnly:true,
 fieldFollowStretch:true,fieldStretchOffset:0,fieldsEnabled:false,fields:[newField()],fieldTargets:{},contourColourAnimate:false,contourColourWave:'sine',contourColourFrequency:.2,contourColourAmount:.25,contourColourPhase:0,contourColourReach:.5,contourColourWidth:.35,contourColourSharpness:2,renderMode:'fluid',contourPulse:false,contourCount:3,contourReach:.18,contourWidth:.025,contourSpeed:.2,contourFade:1.4,copyOrder:'behind',copyCount:0,copySpacing:.16,copyOffsetX:0,copyOffsetY:0,copySpreadX:0,copySpreadY:0,copyRotation:0,copyOpacity:.7,pulseEnabled:false,pulseSpeed:.2,pulseExpansion:.7,pulseStagger:.18,pulseFade:1.4,mainPulseInfluence:0,deformType:'wave',deformAmount:0,deformScale:2,deformAngle:0,deformSpeed:.15,mainInfluence:0,copyInfluence:1,deformOffset:.8,innerEnabled:false,edgeEnabled:false,innerStops:null,edgeStops:null,innerMapping:'inset',innerDepth:.1,innerAngle:90,innerScale:1,innerOffset:0,innerSoftness:.65,layerOpacity:1,blendMode:'normal',glassStrength:0,glassTransmission:.85,glassReflection:.18,glassThickness:.05,dispersion:.1,opticalCollision:false,opticalOrbit:0,opticalOrbitSpeed:0,opticalRipple:0,opticalRippleFrequency:4,opticalRippleSpeed:.3,opticalBreathe:0,opticalBreatheSpeed:.15,opticalExposure:1,opticalInner:.25,opticalOuter:.65,opticalOffset:.3,opticalStretch:0,opticalAngle:270,opticalBend:0,opticalSpeed:.15,opticalInside:1,opticalOutside:1,opticalEdge:.5,opticalEdgeWidth:.003,opticalSoftness:.5,
 shape:'svg',svg:'',sourceName:'PS_Blue.svg',sourceMode:'alpha',sourceThreshold:.65,aspect:'16:9',size:.57,stretchX:1,stretchY:1,corner:.22,rotation:0,posX:0,posY:0,
 direction:'outward',collision:true,fluidity:1,flowSpeed:.13,driftAngle:45,turbulence:.24,eddySize:.54,evolution:.48,swirl:.55,viscosity:.32,momentum:.78,diffusion:.12,lifetime:5.5,seed:17,
 emission:2.1,emissionWidth:.009,glowStrength:1.25,glowRadius:.35,reach:.55,falloff:1.8,exposure:1.05,rim:.26,shapeFill:0,pulse:.04,
 colourMode:'gradient',gradientType:'linear',gradientAngle:90,gradientScale:1.85,gradientSmooth:.65,colourDrift:0,stops:presets.spectral.stops.map(([colour,position])=>({colour,position})),background:'#070916',bgAlpha:1,grain:.18,quality:'512',preset:'spectral',
 venetian:false,effectDirection:'straight',effectTimeDisplacement:0,effectAmount:.55,effectSlats:36,effectAngle:0,effectDepth:.45,effectSoftness:.55,effectSpeed:0,effectOffset:0
};
const definitions={
 contourColourFrequency:['Contour colour cycles / second',-3,3,.01,'Animation frequency. Negative reverses direction; zero holds the phase.'],
 contourColourAmount:['Contour colour pulse amount (%)',-1,1,.01,'Palette excursion added to Colour at contour. Negative pulses toward earlier stops.',100],
 contourColourPhase:['Contour colour phase (°)',0,360,1,'Offset the cycle without changing the animation clock.'],
 contourColourReach:['Colour pulse outward reach',.01,2,.01,'Distance travelled outward from the shape during each cycle.'],
 contourColourWidth:['Colour pulse width (%)',.02,1,.01,'Fraction of each cycle occupied by the colour pulse.',100],
 contourColourSharpness:['Colour pulse sharpness',.25,8,.05,'Higher values give a tighter pulse; lower values soften it.'],
 fieldStretchOffset:['Field stretch offset (°)',-180,180,1,'Rotate stretch relative to the field normal; zero follows the field.'],
 trimDuration:['Reveal cycle (s)',.5,20,.1,'Time for a drawing or draw/erase cycle.'],
 trimIn:['In (%)',0,100,.1,'Start of the visible contour segment.'],
 trimOut:['Out (%)',0,100,.1,'End of the visible contour segment. In above Out wraps across the start.'],
 trimOffset:['Offset (°)',-360,360,1,'Move both endpoints around the contour.'],
 trimVelocity:['Offset velocity (°/s)',-360,360,1,'Positive or negative speed around the path; zero holds the offset.'],
 trimFeather:['Endpoint feather (%)',0,20,.1,'Soften the revealed segment at both ends.'],
 trimWidth:['Outline width (%)',.001,.1,.001,'Width inside the silhouette when revealing an outline.',100],
 tipInside:['Inward reach (%)',0,1,.005,'Light spreads toward the inside of the line. Zero disables this side.',100],
 tipOutside:['Outward reach (%)',0,1,.005,'Light spreads outside the line. Zero disables this side.',100],
 tipAdherence:['Contour adherence (%)',0,1,.01,'0% casts a straight fan from the tip. 100% wraps the light along the silhouette, including holes. Reach still controls its width.',100],
 tipFanStart:['Fan start (% of tail)',-100,100,1,'0 starts spreading at the tip. Positive values delay spreading behind it; negative values make the fan already open at the tip. 100 keeps a narrow ribbon.'],
 tipLength:['Tail length (%)',.005,2,.005,'Length of the tapered beam behind each tip.',100],
 tipStrength:['Tip brightness',0,5,.05,'Strength of the light emitted by the moving tip.'],
 tipSoftness:['Tip softness (%)',0,1,.01,'Feather the edges and fade along the tail.',100],
 contourCount:['Contour bands',1,8,1,'Number of equally staggered waves.'],
 contourReach:['Contour travel (%)',.01,1,.005,'Distance bands travel out from every edge, in canvas short-side units.',100],
 contourWidth:['Contour band width (%)',.001,.2,.001,'Width of each moving colour band.',100],
 contourSpeed:['Contour cycles / second',0,2,.01,'Outward pulse speed. Zero freezes the bands.'],
 contourFade:['Contour fade curve',.1,4,.05,'How quickly each travelling band fades away.'],
 copyCount:['Number of copies',0,12,1,'Copies behind the main graphic. Zero keeps only the main shape.'],
 copySpacing:['Scale step (%)',0,.6,.005,'Scale added to each successive copy.',100],
 copyOffsetX:['X offset per copy (%)',-.5,.5,.005,'Horizontal offset in canvas short-side units.',100],
 copyOffsetY:['Y offset per copy (%)',-.5,.5,.005,'Vertical offset in canvas short-side units.',100],
 copySpreadX:['X spread ± (%)',0,.5,.005,'Alternates copies left and right. Later pairs spread farther apart.',100],
 copySpreadY:['Y spread ± (%)',0,.5,.005,'Alternates copies up and down. Later pairs spread farther apart.',100],
 copyRotation:['Rotation per copy (°)',-90,90,1,'Rotate successive copies around the source centre.'],
 copyOpacity:['Copies opacity (%)',0,1,.01,'Opacity of copies relative to the main graphic.',100],
 pulseSpeed:['Pulse cycles / second',0,2,.01,'Speed of the expanding copy pulses. Zero holds them still.'],
 pulseExpansion:['Pulse expansion (%)',0,3,.01,'How far each copy grows during one pulse.',100],
 pulseStagger:['Delay between copies (%)',0,1,.01,'Phase offset between successive pulses.',100],
 pulseFade:['Pulse fade curve',.1,4,.05,'How quickly copies disappear as they expand.'],
 mainPulseInfluence:['Main shape pulse (%)',0,1,.01,'Blend the main graphic into the same expansion and opacity curve as the copies. Zero keeps it steady.',100],
 deformAmount:['Displacement amount (%)',0,1,.01,'Strength of displacement applied to the silhouette itself.',100],
 deformScale:['Displacement frequency',.1,8,.1,'Size and density of waves or noise.'],
 deformAngle:['Displacement direction (°)',0,360,1,'Direction of wave displacement.'],
 mainInfluence:['Main shape influence (%)',0,1,.01,'Zero preserves the original graphic; 100 applies the full displacement.',100],
 copyInfluence:['Copies influence (%)',0,1,.01,'How much displacement affects the copies.',100],
 deformOffset:['Deformation offset per copy',0,6.28,.05,'Phase shift so copies do not deform identically.'],
 deformSpeed:['Displacement speed',-1,1,.01,'Animate the deformation. Negative reverses; zero freezes it.'],
 innerDepth:['Inward gradient depth',.002,1,.002,'How far the independent interior gradient travels inward from the contour.'],
 innerAngle:['Interior angle (°)',0,360,1,'Direction of the interior linear gradient.'],
 innerScale:['Interior gradient scale',.1,5,.05,'Size of the interior linear or radial colour field.'],
 innerOffset:['Interior gradient offset',-1,1,.01,'Shift the colour positions inside the shape.'],
 innerSoftness:['Interior colour blur',0,5,.01,'Independent softness and strong Gaussian blur for the interior palette.'],
 layerOpacity:['Layer opacity (%)',0,1,.01,'Opacity of the main shape and the copy stack.',100],
 glassStrength:['Glass refraction (%)',0,1,.01,'Bend the layers underneath each shape. Zero disables refraction.',100],
 glassTransmission:['Glass transparency (%)',0,1,.01,'Show refracted layers through the glass body. Zero keeps the original opaque surface.',100],
 glassReflection:['Glass reflections (%)',0,1,.01,'Subtle Fresnel reflections along the polished glass edges.',100],
 glassThickness:['Glass edge depth',.005,.3,.005,'Depth of the refracting edge profile.'],
 dispersion:['Glass colour dispersion',0,1,.01,'Separate red and blue slightly in the refracted underlying layers.'],
 opticalOrbit:['Colour orbit (%)',0,1,.01,'Blend into colour circulating along the source contour, with a smooth interior sweep and no central pinwheel.',100],
 opticalOrbitSpeed:['Orbit speed',-1,1,.01,'Rotate colours around the shape. Negative reverses direction; zero holds the colour placement.'],
 opticalRipple:['Ripple amount (%)',0,1,.01,'Gently ripple the outer colour field while leaving the graphic edge in place.',100],
 opticalRippleFrequency:['Ripple frequency',1,12,1,'Number of waves around the graphic.'],
 opticalRippleSpeed:['Ripple speed',-2,2,.01,'Animate the ripples. Negative reverses direction; zero holds the distortion.'],
 opticalBreathe:['Breathing amount (%)',0,1,.01,'Expand and contract the outer atmosphere without scaling the graphic.',100],
 opticalBreatheSpeed:['Breathing speed',0,2,.01,'Breathing cycles per second. Zero freezes the breathing effect.'],
 opticalExposure:['Optical exposure',.1,3,.05,'Brightness of the colour field, independent of the Fluid lighting.'],
 opticalInner:['Inside colour reach',0,1.5,.001,'Distance over which the palette travels inside your silhouette.'],
 opticalOuter:['Outside colour reach',0,3,.001,'Distance over which colour bands spread beyond the graphic. Zero returns to the original silhouette.'],
 opticalOffset:['Colour at contour (%)',0,1,.01,'Choose the palette position anchored to the original edge.',100],
 opticalStretch:['Light stretch',0,2,.01,'Sweep the outer light in one direction without stretching your graphic.'],
 opticalAngle:['Stretch angle (°)',0,360,1,'Manual direction when field alignment is off: 0 right, 90 up, 180 left, 270 down.'],
 opticalBend:['Curtain bend',0,1,.01,'Bend the atmosphere while the original graphic stays fixed.'],
 opticalSpeed:['Optical motion',0,1,.01,'Slowly evolve the bend and colour. Set to zero for a still composition.'],
 opticalInside:['Interior opacity (%)',0,1,.01,'Control colour inside the original graphic independently.',100],
 opticalOutside:['Atmosphere opacity (%)',0,1,.01,'Control the colour field outside your graphic.',100],
 opticalEdge:['Sharp edge strength',0,2,.01,'A precise rim, independent of the soft colour field.'],
 opticalEdgeWidth:['Sharp edge width (%)',0,.03,.001,'Thickness of the rim on your original silhouette.',100],
 opticalSoftness:['Outer feather',0,1,.01,'Fade and cut away the outer colour bands. At maximum, fade begins near the graphic and reaches full transparency well before the outer reach.'],
 sourceThreshold:['Selection threshold',0,1,.01,'Choose which light or dark parts of the SVG become the emitter.'],
 size:['Size (%)',.01,10,.01,'Scale the source relative to the canvas’s shorter side. Go above 100% to let it bleed beyond the frame, up to 1000%.',100],
 stretchX:['Horizontal stretch (%)',.02,10,.01,'Stretch the source horizontally without changing its height.',100],
 stretchY:['Vertical stretch (%)',.02,10,.01,'Stretch the source vertically without changing its width.',100],
 corner:['Corner roundness',0,.5,.01,'Roundness of the built-in square.'],
 rotation:['Rotation (°)',-180,180,1,'Rotate the source around its centre.'],
 posX:['Horizontal position (%)',-200,200,.1,'Move the source left or right.'],posY:['Vertical position (%)',-200,200,.1,'Positive values move the source upward.'],
 fluidity:['Fluidity (%)',0,1,.01,'Blend between a steady halo and the flowing light field.',100],
 flowSpeed:['Flow speed',0,.65,.01,'How quickly light travels away from, or around, the contour.'],
 driftAngle:['Drift angle (°)',0,360,1,'Direction of travel in Directional drift mode.'],
 turbulence:['Turbulence strength',0,1.5,.01,'How strongly the current is disturbed. Higher values create more irregular motion.'],
 eddySize:['Eddy size (%)',.08,1.2,.01,'Larger values make broad, rolling currents. Smaller values make fine, busy swirls.',100],
 evolution:['Evolution speed',0,2,.01,'How quickly the pattern of currents itself changes. Independent of flow speed.'],
 swirl:['Swirl strength',0,2,.01,'Reinforce the rolling, curling motion of the flow.'],
 viscosity:['Viscosity',0,1,.01,'Smooth neighbouring velocities. Low is thin and mobile; high is thicker and more cohesive.'],
 momentum:['Momentum',0,1,.01,'How long the current keeps moving after a disturbance.'],
 diffusion:['Colour diffusion',0,1,.01,'How much neighbouring colour ribbons spread and blend.'],
 lifetime:['Trail lifetime (s)',.3,12,.1,'Time for a trail to fade to about 37% of its brightness.'],
 seed:['Variation seed',1,99,1,'Choose a repeatable variation of the current. Restart to compare.'],
 emission:['Emission intensity',0,5,.05,'How much luminous colour the contour releases.'],
 emissionWidth:['Emission width (%)',.002,.05,.001,'Thickness of the emitting band around the contour.',100],
 glowStrength:['Glow strength',0,3,.05,'Brightness of the soft halo around the moving ribbons.'],
 glowRadius:['Glow softness',0,1,.01,'Spread the halo into a broad, soft bloom.'],
 reach:['Light reach (%)',.05,1.2,.01,'How far the visible light extends from the source.',100],
 falloff:['Falloff',.3,4,.05,'Shape the fade with distance. Larger values keep light closer before fading steeply.'],
 exposure:['Exposure',.1,3,.05,'Overall brightness of the emitted light.'],
 rim:['Contour brightness',0,2,.01,'Keep a luminous rim precisely attached to the source.'],
 shapeFill:['Shape fill (%)',0,1,.01,'Give the inside of the silhouette a subtle coloured body.',100],
 pulse:['Emission pulse',0,1,.01,'Gently vary the amount of emitted light over time.'],
 gradientAngle:['Gradient angle (°)',0,360,1,'Rotate the colour gradient.'],
 gradientScale:['Gradient scale',.3,5,.05,'How tightly the colour range is distributed around the source.'],
 gradientSmooth:['Gradient softness',0,5,.01,'0–1 eases the transitions. Above 1, Gaussian blur blends across multiple colour stops. Push to 5 for a very diffuse colour wash.'],
 colourDrift:['Colour drift',-2,2,.01,'Move slowly through the palette. Set to zero for stable colour mapping.'],
 bgAlpha:['Background opacity (%)',0,1,.01,'Zero gives a transparent background; 100 gives a solid colour.',100],
 grain:['Grain',0,1,.01,'A subtle texture in the luminous areas.'],
 effectTimeDisplacement:['Time displacement / rib (s)',-2,2,.01,'Offset animation time per strip. Animate rib motion or Optical motion to see the stagger. Negative reverses the delay.'],
 effectAmount:['Effect amount (%)',0,1,.01,'Blend prismatic ribbing across the main shape, copies and surrounding light.',100],
 effectSlats:['Slat count',6,160,1,'Number of light ribs across one canvas short side.'],
 effectAngle:['Slat angle (°)',0,180,1,'Zero gives vertical ribs; 90 gives horizontal ribs.'],
 effectDepth:['Refraction depth',0,1,.01,'Shift the flowing light inside each slat, like ribbed glass.'],
 effectSoftness:['Slat softness',.02,1,.01,'Soften the transitions between prismatic ribs.'],
 effectSpeed:['Slat motion',-1,1,.01,'Animate the ribs. Zero keeps them still.'],
 effectOffset:['Slat offset (%)',0,1,.01,'Position the ribs independently of the animation time.',100]
};
const groups={
 contourColourControls:['contourColourFrequency','contourColourAmount','contourColourPhase','contourColourReach','contourColourWidth','contourColourSharpness'],
 trimControls:['trimIn','trimOut','trimOffset','trimFeather','trimWidth'],trimMotionControls:['trimVelocity'],trimRevealControls:['trimDuration'],tipControls:['tipAdherence','tipFanStart','tipInside','tipOutside','tipLength','tipStrength','tipSoftness'],
 contourControls:['contourCount','contourReach','contourWidth','contourSpeed','contourFade'],
 copyControls:['copyCount','copySpacing','copyOffsetX','copyOffsetY','copySpreadX','copySpreadY','copyRotation','copyOpacity'],
 deformControls:['deformAmount','deformScale','deformAngle','mainInfluence','copyInfluence','deformOffset','opticalStretch','opticalAngle','opticalBend','opticalRipple','opticalRippleFrequency'],
 innerControls:['innerDepth','innerAngle','innerScale','innerOffset','innerSoftness'],
 materialControls:['layerOpacity','opticalExposure','glassStrength','glassTransmission','glassReflection','glassThickness','dispersion'],
 opticalAnimationControls:['pulseSpeed','pulseExpansion','pulseStagger','pulseFade','mainPulseInfluence','deformSpeed','opticalOrbit','opticalOrbitSpeed','opticalRippleSpeed','opticalBreathe','opticalBreatheSpeed','opticalSpeed'],
 opticalControls:['opticalInner','opticalOuter','opticalOffset','opticalInside','opticalOutside','opticalEdge','opticalEdgeWidth','opticalSoftness'],
 thresholdControl:['sourceThreshold'],sourceControls:['size','stretchX','stretchY','corner','rotation','posX','posY'],motionControls:['fluidity','flowSpeed','driftAngle','turbulence','eddySize','evolution','swirl','viscosity','momentum','diffusion','lifetime','seed'],lightControls:['emission','emissionWidth','glowStrength','glowRadius','reach','falloff','exposure','rim','shapeFill','pulse'],gradientControls:['gradientAngle','gradientScale','gradientSmooth','colourDrift'],backgroundControls:['bgAlpha'],finishControls:['grain'],effectControls:['effectTimeDisplacement','effectAmount','effectSlats','effectAngle','effectDepth','effectSoftness','effectSpeed','effectOffset']};
const enumValues={effectDirection:['straight','outward'],contourColourWave:['sine','triangle','pulse'],trimReveal:['none','draw','pingpong'],trimStyle:['shape','line'],tipMode:['off','out','in','both'],copyOrder:['behind','front'],deformType:['wave','noise','twist'],innerMapping:['inset','linear','radial'],blendMode:['normal','add','screen','multiply'],renderMode:['fluid','optical'],shape:['rounded','circle','triangle','cross','star','svg'],aspect:['16:9','1:1','4:5','9:16'],sourceMode:['alpha','light','dark'],direction:['outward','upward','orbit','drift'],colourMode:['gradient','single'],gradientType:['linear','radial','angular'],quality:['256','384','512','768','1024'],preset:Object.keys(presets)};
const colourOK=value=>/^#[0-9a-f]{6}$/i.test(value);
function validateSettings(candidate){
 if(!candidate||typeof candidate!=='object')throw new Error('This is not a Liquid Light project.');
 const s=structuredClone(defaults);
 for(const [key,def] of Object.entries(definitions)){const value=Number(candidate[key]);if(Number.isFinite(value)&&candidate[key]!==undefined)s[key]=Math.max(def[1],Math.min(def[2],value));}
 for(const [key,options] of Object.entries(enumValues))if(options.includes(candidate[key]))s[key]=candidate[key];
 s.fieldFollowStretch=candidate.fieldFollowStretch!==false;
 s.fieldsEnabled=candidate.fieldsEnabled===true;s.fields=cleanFields(candidate.fields??s.fields);s.fieldTargets=Object.fromEntries(['colour','deformation','venetian','emission','turbulence','glass','stretch'].map(k=>[k,k==='colour'?candidate.fieldTargets?.[k]===true:candidate.fieldTargets?.[k]!==false]));
 if(colourOK(candidate.background))s.background=candidate.background;
 if(typeof candidate.collision==='boolean')s.collision=candidate.collision;
 if(typeof candidate.opticalCollision==='boolean')s.opticalCollision=candidate.opticalCollision;
 for(const key of ['contourColourAnimate','trimEnabled','trimAnimate','tipOnly','contourPulse','pulseEnabled','innerEnabled','edgeEnabled'])if(typeof candidate[key]==='boolean')s[key]=candidate[key];
 if(typeof candidate.venetian==='boolean')s.venetian=candidate.venetian;
 if(Array.isArray(candidate.stops)&&candidate.stops.length){
  const stops=candidate.stops.slice(0,10).filter(v=>v&&colourOK(v.colour)&&Number.isFinite(Number(v.position))).map(v=>({colour:v.colour,position:Math.max(0,Math.min(1,Number(v.position)))}));
  if(stops.length)s.stops=stops;
 }
 for(const key of ['innerStops','edgeStops'])if(Array.isArray(candidate[key])){
  const stops=candidate[key].slice(0,10).filter(v=>v&&colourOK(v.colour)&&Number.isFinite(Number(v.position))).map(v=>({colour:v.colour,position:Math.max(0,Math.min(1,Number(v.position)))}));if(stops.length)s[key]=stops;
 }
 if(typeof candidate.svg==='string'&&candidate.svg.length)s.svg=sanitiseSVG(candidate.svg);
 if(typeof candidate.sourceName==='string')s.sourceName=candidate.sourceName.slice(0,200);
 return s;
}
let settings=structuredClone(defaults),engine,workspace,sourceTransform,fieldOverlay,lookPicker,ready=false,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,dirty=true,revision=0,exporting=false,lastFrame=0,saveTimer,rebuildTimer,toastTimer,storageWarned=false;
let studioUI;
let gradientTarget='exterior',selectionMode=false;
function setSelectionMode(value){selectionMode=!!value;sourceTransform?.setActive(selectionMode);fieldOverlay?.setAvailable(selectionMode);$('frame').classList.toggle('selection-mode',selectionMode);}
window.addEventListener('keydown',e=>{
 if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,textarea,select,[contenteditable="true"]')||document.querySelector('dialog[open]'))return;
 if(e.key.toLowerCase()==='a'){e.preventDefault();setSelectionMode(!selectionMode);}
 else if(e.key==='Escape')setSelectionMode(false);
});
const fieldsPanel=createFieldsPanel({getSettings:()=>settings,onChange:()=>{dirty=true;saveLocal();fieldOverlay?.sync();},onSelection:()=>fieldOverlay?.sync()});
const storageKey='liquid-light-studio-v1';
try{const saved=localStorage.getItem(storageKey);if(saved)settings=validateSettings(JSON.parse(saved));}catch{}
const editHistory=createHistory(settings);let historyGesture=false,historyTimer;
function commitHistory(){clearTimeout(historyTimer);editHistory.record(settings);}
window.addEventListener('pointerdown',()=>{commitHistory();historyGesture=true;},true);
const endHistoryGesture=()=>{historyGesture=false;queueMicrotask(commitHistory);};
window.addEventListener('pointerup',endHistoryGesture,true);window.addEventListener('pointercancel',endHistoryGesture,true);
window.addEventListener('blur',endHistoryGesture);
window.addEventListener('keydown',e=>{
 if(!(e.ctrlKey||e.metaKey)||e.altKey||!['z','y'].includes(e.key.toLowerCase()))return;
 if(e.target.closest?.('textarea,[contenteditable="true"],input[type="text"],input[type="search"],input[type="email"],input[type="url"],input:not([type])'))return;
 if(historyGesture||exporting)return;e.preventDefault();clearTimeout(historyTimer);
 const redo=e.key.toLowerCase()==='y'||e.shiftKey;
 const next=redo?(commitHistory(),editHistory.redo()):editHistory.undo(settings);
 if(!next)return;settings=next;clearTimeout(rebuildTimer);syncUI();saveLocal();rebuild(true);toast(redo?'Redone.':'Undone.');
});
function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4200);}
function saveLocal(){clearTimeout(historyTimer);if(!historyGesture)historyTimer=setTimeout(commitHistory,350);clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem(storageKey,JSON.stringify(settings));}catch{if(!storageWarned){storageWarned=true;toast('Browser storage is unavailable. Save a project to keep your settings.');}}},350);}
function ratio(){const [w,h]=settings.aspect.split(':').map(Number);return w/h;}
function format(value,step){const digits=step>=1?0:step>=.1?1:step>=.01?2:3;return Number(value.toFixed(digits)).toString();}
const sliders={};
function resetButton(label,onReset,text='↺'){
 const button=document.createElement('button');button.type='button';button.className='control-reset';button.textContent=text;button.title=`Reset ${label}`;button.setAttribute('aria-label',`Reset ${label}`);
 button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();onReset();});return button;
}
for(const [group,keys] of Object.entries(groups))for(const key of keys){
 const [label,min,max,step,tip,mult=1]=definitions[key],row=document.createElement('div');row.className='slider-control';row.dataset.control=key;
 const header=document.createElement('div');header.className='slider-header';const caption=document.createElement('label');caption.htmlFor='slider-'+key;caption.textContent=label;caption.title=tip;
 const number=document.createElement('input');number.type='number';number.className='slider-number';number.min=format(min*mult,step*mult);number.max=format(max*mult,step*mult);number.step=format(step*mult,step*mult);number.setAttribute('aria-label',label+' value');
 const slider=document.createElement('input');slider.type='range';slider.min=min;slider.max=max;slider.step=step;slider.id='slider-'+key;slider.title=tip;
 const actions=document.createElement('div');actions.className='slider-actions';actions.append(number,resetButton(label,()=>resetControl(key)));
 header.append(caption,actions);row.append(header,slider);$(group).append(row);sliders[key]={slider,number,row};
 const update=value=>{const parsed=Number(value);if(!Number.isFinite(parsed))return;settings[key]=Math.max(min,Math.min(max,parsed));updateSlider(key);changed(key);};
 slider.addEventListener('input',()=>update(slider.value));number.addEventListener('change',()=>update(Number(number.value)/mult));
}
function updateSlider(key){const item=sliders[key],def=definitions[key],mult=def[5]||1;item.slider.value=settings[key];item.number.value=format(settings[key]*mult,def[3]*mult);item.slider.style.setProperty('--progress',`${(settings[key]-def[1])/(def[2]-def[1])*100}%`);}
function visibility(){
 $('contourColourOptions').hidden=!settings.contourColourAnimate;for(const key of ['contourColourReach','contourColourWidth','contourColourSharpness'])sliders[key].row.hidden=settings.contourColourWave!=='pulse';
 $('trimOptions').hidden=!settings.trimEnabled;$('tipOptions').hidden=settings.tipMode==='off';$('trimMotionControls').hidden=!settings.trimAnimate;$('trimRevealControls').hidden=settings.trimReveal==='none';sliders.trimWidth.row.hidden=settings.trimStyle!=='line';
 const optical=settings.renderMode==='optical';
 for(const id of ['copiesSection','deformationSection','materialOptical','interiorOptions','gradientTargetRow'])$(id).hidden=!optical;
 $('innerControls').hidden=!settings.innerEnabled;
 $('colourMode').closest('.select-row').hidden=optical&&gradientTarget!=='exterior';
 $('innerMapping').closest('.select-row').hidden=!settings.innerEnabled;
 $('copyControls').classList.toggle('is-disabled',settings.copyCount===0);
 for(const key of ['innerAngle','innerScale'])sliders[key].row.hidden=settings.innerMapping==='inset';
 sliders.innerDepth.row.hidden=settings.innerMapping!=='inset';
 document.querySelectorAll('[data-setup]').forEach(button=>{button.hidden=button.dataset.mode!==settings.renderMode;});
 $('opticalCollisionRow').hidden=!optical;$('opticalSection').hidden=!optical;$('opticalAnimationSection').hidden=!optical;$('motionSection').hidden=optical;$('fluidLightSection').hidden=optical;
 $('gradientTypeRow').hidden=optical||settings.colourMode==='single';
 for(const key of ['gradientAngle','gradientScale','colourDrift'])sliders[key].row.hidden=optical;
 $('stageNoteText').textContent='Press A for the white selection arrow, then click the graphic or a field to show its handles. Press A again or Escape to hide controls. Alt-drag or middle-drag pans; wheel zooms. View zoom leaves exports unchanged.';
 $('modeHint').textContent=optical?'Colour flows from inside → contour → atmosphere. Use Deformation to control how much the main graphic and copies are affected.':'Animated currents emitted from your graphic. Drag the preview to stir.';

 $('svgOptions').hidden=settings.shape!=='svg';sliders.sourceThreshold.row.hidden=settings.sourceMode==='alpha';sliders.corner.row.hidden=settings.shape!=='rounded';sliders.driftAngle.row.hidden=settings.direction!=='drift';
 $('gradientTypeRow').hidden=optical||settings.colourMode==='single';$('gradientControls').hidden=(optical&&gradientTarget==='interior')||settings.colourMode==='single';$('addStop').hidden=gradientTarget==='exterior'&&settings.colourMode==='single';
 sliders.gradientScale.row.hidden=optical||settings.gradientType==='angular';
 $('effectControls').hidden=!settings.venetian;$('effectDirection').closest('.select-row').hidden=!settings.venetian;sliders.effectAngle.row.hidden=settings.effectDirection==='outward';
 studioUI?.sync();
}
function activeStops(){
 if(gradientTarget==='exterior')return settings.stops;
 const key=gradientTarget==='interior'?'innerStops':'edgeStops';
 if(!settings[key]?.length)settings[key]=structuredClone(settings.stops);
 return settings[key];
}
$('gradientTarget').addEventListener('change',()=>{gradientTarget=$('gradientTarget').value;if(gradientTarget==='interior')settings.innerEnabled=true;if(gradientTarget==='edge')settings.edgeEnabled=true;$('innerEnabled').checked=settings.innerEnabled;$('edgeEnabled').checked=settings.edgeEnabled;renderStops();visibility();saveLocal();dirty=true;});
function updateGradientPreview(){const stops=[...activeStops()].sort((a,b)=>a.position-b.position);$('gradientPreview').style.background=gradientTarget==='exterior'&&settings.colourMode==='single'?activeStops()[0].colour:`linear-gradient(90deg,${stops.map(s=>`${s.colour} ${s.position*100}%`).join(',')})`;}
const stopDefaults=new WeakMap();
function renderStops(){
 const container=$('gradientStops');container.replaceChildren();const single=gradientTarget==='exterior'&&settings.colourMode==='single';
 activeStops().forEach((stop,index)=>{
  if(single&&index>0)return;if(!stopDefaults.has(stop))stopDefaults.set(stop,{...stop});const row=document.createElement('div');row.className='gradient-stop';
  const colour=document.createElement('input');colour.type='color';colour.value=stop.colour;colour.setAttribute('aria-label',`Colour stop ${index+1}`);
  colour.addEventListener('input',()=>{stop.colour=colour.value;updateGradientPreview();dirty=true;saveLocal();});row.append(colour);
  if(!single){
   const position=document.createElement('input');position.type='range';position.min=0;position.max=100;position.step=1;position.value=Math.round(stop.position*100);position.setAttribute('aria-label',`Position of colour stop ${index+1}`);position.style.setProperty('--progress',`${position.value}%`);
   const number=document.createElement('input');number.type='number';number.className='stop-position';number.min=0;number.max=100;number.step=1;number.value=Math.round(stop.position*100);number.setAttribute('aria-label',`Colour stop ${index+1} position percent`);
   const update=value=>{if(!Number.isFinite(Number(value)))return;stop.position=Math.max(0,Math.min(100,Number(value)))/100;position.value=stop.position*100;number.value=stop.position*100;position.style.setProperty('--progress',`${position.value}%`);updateGradientPreview();dirty=true;saveLocal();};
   position.addEventListener('input',()=>update(position.value));number.addEventListener('change',()=>update(number.value));
   const unit=document.createElement('span');unit.className='stop-unit';unit.textContent='%';const remove=document.createElement('button');remove.className='remove-stop';remove.textContent='×';remove.setAttribute('aria-label',`Remove colour stop ${index+1}`);remove.disabled=activeStops().length<=2;
   remove.addEventListener('click',()=>{activeStops().splice(index,1);renderStops();dirty=true;saveLocal();});row.append(position,number,unit,remove);
  }row.append(resetButton(`colour stop ${index+1}`,()=>{Object.assign(stop,stopDefaults.get(stop));renderStops();dirty=true;saveLocal();}));container.append(row);
 });
 $('addStop').disabled=activeStops().length>=10;updateGradientPreview();
}
$('addStop').addEventListener('click',()=>{
 if(activeStops().length>=10)return;const sorted=[...activeStops()].sort((a,b)=>a.position-b.position);let a=sorted[0],b=sorted.at(-1),gap=0;
 for(let i=1;i<sorted.length;i++)if(sorted[i].position-sorted[i-1].position>gap){gap=sorted[i].position-sorted[i-1].position;a=sorted[i-1];b=sorted[i];}
 const rgb=[1,3,5].map(i=>Math.round((parseInt(a.colour.slice(i,i+2),16)+parseInt(b.colour.slice(i,i+2),16))/2).toString(16).padStart(2,'0')).join('');
 activeStops().push({colour:'#'+rgb,position:(a.position+b.position)/2});activeStops().sort((x,y)=>x.position-y.position);renderStops();dirty=true;saveLocal();
});
function syncUI(){
 fieldsPanel?.sync();fieldOverlay?.sync();
 for(const key of Object.keys(sliders))updateSlider(key);
 for(const key of ['effectDirection','contourColourWave','trimReveal','trimStyle','tipMode','copyOrder','deformType','innerMapping','blendMode','renderMode','preset','aspect','direction','sourceMode','colourMode','gradientType','quality','background'])$(key).value=settings[key];
 for(const key of ['contourColourAnimate','trimEnabled','trimAnimate','tipOnly','contourPulse','pulseEnabled','innerEnabled','edgeEnabled'])$(key).checked=settings[key];
 $('collision').checked=settings.collision;$('opticalCollision').checked=settings.opticalCollision;
 $('venetian').checked=settings.venetian;
 for(const button of document.querySelectorAll('[data-shape]'))button.classList.toggle('selected',button.dataset.shape===settings.shape);
 $('uploadBtn').classList.toggle('selected',settings.shape==='svg');$('sourceName').textContent=settings.shape==='svg'?settings.sourceName:'Use your own silhouette';
 $('frame').style.aspectRatio=ratio();$('frame').style.setProperty('--aspect',ratio());workspace?.fitFrame(ratio());sourceTransform?.sync();lookPicker?.sync(settings.preset);renderStops();visibility();syncPause();dirty=true;
}
function syncPause(){$('pauseBtn').innerHTML=paused?'▶ <span>Play</span>':'Ⅱ <span>Pause</span>';$('pauseBtn').setAttribute('aria-label',paused?'Play animation':'Pause animation');}
function changed(key){
 dirty=true;saveLocal();visibility();
 if(['size','stretchX','stretchY','corner','rotation','posX','posY','sourceThreshold','sourceMode','shape'].includes(key)){clearTimeout(rebuildTimer);rebuildTimer=setTimeout(()=>rebuild(),130);}
 if(key==='seed'&&engine){engine.reset();dirty=true;}
}
function resetControl(key){
 if(!(key in defaults))return;
 if(key==='preset'){applyPreset(defaults.preset);return;}
 settings[key]=structuredClone(defaults[key]);syncUI();
 if(key==='aspect'||key==='quality'){rebuild(true);saveLocal();}else changed(key);
}
const sectionKeys={
 copies:[...groups.copyControls,'copyOrder'],deformation:[...groups.deformControls,'deformType','opticalCollision'],material:[...groups.materialControls,...groups.effectControls,'effectDirection','blendMode','venetian'],finish:['aspect','background','bgAlpha','grain','quality'],optical:[...groups.opticalControls,...groups.contourColourControls,'contourColourAnimate','contourColourWave'],opticalAnimation:[...groups.contourColourControls,'contourColourAnimate','contourColourWave',...groups.opticalAnimationControls,...groups.contourControls,'contourPulse','pulseEnabled'],
 source:[...groups.sourceControls,...groups.thresholdControl,...groups.trimControls,...groups.trimMotionControls,...groups.trimRevealControls,...groups.tipControls,'sourceMode','trimEnabled','trimAnimate','trimReveal','trimStyle','tipMode','tipOnly'],
 motion:[...groups.motionControls,'direction','collision'],
 light:[...groups.lightControls],
 colour:[...groups.contourColourControls,'contourColourAnimate','contourColourWave',...groups.innerControls,...groups.opticalControls,'innerEnabled','edgeEnabled','innerStops','edgeStops','innerMapping',...groups.gradientControls,'colourMode','gradientType','stops'],
 effects:[...groups.effectControls,'effectDirection','venetian']
};
function resetSection(section){
 const keys=sectionKeys[section];if(!keys)return;
 for(const key of keys)settings[key]=structuredClone(defaults[key]);syncUI();saveLocal();
 if(section==='source'||section==='colour'||section==='finish')rebuild(true);else dirty=true;
 toast(`${{copies:'Copies',deformation:'Deformation',material:'Material',finish:'Finish',opticalAnimation:'Optical animation',optical:'Optical',source:'Source',motion:'Motion',light:'Light',colour:'Colour & finish',effects:'Effects'}[section]} controls reset.`);
}
for(const summary of document.querySelectorAll('.control-section summary')){
 const body=summary.parentElement;
 const section=body.dataset.reset|| (body.querySelector('#opticalAnimationControls')?'opticalAnimation':body.querySelector('#opticalControls')?'optical':body.querySelector('#sourceControls')?'source':body.querySelector('#motionControls')?'motion':body.querySelector('#lightControls')?'light':body.querySelector('#gradientControls')?'colour':body.querySelector('#effectControls')?'effects':null);
 if(!section)continue;
 const actions=document.createElement('span');actions.className='section-summary-actions';
 actions.append(resetButton(`${section} section`,()=>resetSection(section),'Reset'),summary.querySelector('.chevron'));summary.append(actions);
}
for(const key of ['effectDirection','contourColourWave','trimReveal','trimStyle','tipMode','copyOrder','deformType','innerMapping','blendMode','renderMode','preset','aspect','direction','sourceMode','colourMode','gradientType','quality','background']){
 const input=$(key),parent=input.parentElement,wrapper=document.createElement('div');wrapper.className='control-value';parent.insertBefore(wrapper,input);wrapper.append(input,resetButton(key==='background'?'background colour':key,()=>resetControl(key)));
}
async function rebuild(reconfigure=false,interactive=false){
 if(!engine)return false;const id=++revision;ready=false;$('statusText').textContent='Reading the silhouette…';
 try{
  if(reconfigure)engine.configure(ratio(),Number(settings.quality));
  const r=ratio(),detail=Math.min(engine.maxSize,matchMedia('(pointer: coarse)').matches?1024:3072,interactive?512:Number(settings.quality)>=768?3072:2048),w=Math.round(r>=1?detail:detail*r),h=Math.round(r>=1?detail/r:detail);
  const source=await makeSourceField(settings,w,h);if(id!==revision)return false;
  engine.setSource(source);sourceTransform?.setSource(source);for(let i=0;i<(interactive?0:12);i++)engine.step(settings,1/30);ready=true;dirty=true;$('engineError').hidden=true;$('statusText').textContent=paused?'Paused · edit any control':'Live · drag to stir';saveLocal();return true;
 }catch(error){if(id!==revision)return false;ready=!!engine.source;dirty=true;toast(error.message);$('statusText').textContent='Check the source settings';if(!ready){$('engineError').hidden=false;$('engineError').textContent='Shape loading failed: '+error.message;}return false;}
}
for(const key of ['effectDirection','contourColourWave','trimReveal','trimStyle','tipMode','copyOrder','deformType','innerMapping','blendMode','renderMode','direction','sourceMode','colourMode','gradientType','background'])$(key).addEventListener('input',()=>{settings[key]=$(key).value;if(key==='colourMode')renderStops();changed(key);});
for(const key of ['aspect','quality'])$(key).addEventListener('change',()=>{settings[key]=$(key).value;syncUI();rebuild(true);});
for(const button of document.querySelectorAll('[data-shape]'))button.addEventListener('click',()=>{settings.shape=button.dataset.shape;syncUI();rebuild();});
$('centerBtn').addEventListener('click',()=>{settings.posX=0;settings.posY=0;syncUI();rebuild();});
function applyPreset(name){
 const p=presets[name];if(!p)return;
 const base=Object.fromEntries(Object.keys(brandMotion).map(key=>[key,defaults[key]]));
 Object.assign(settings,base,{gradientType:'linear',gradientScale:1.85,gradientSmooth:.65,colourDrift:0,colourMode:'gradient',bgAlpha:1},name.startsWith('ps-')?brandMotion:{},p);
 settings.preset=name;settings.stops=p.stops.map(([colour,position])=>({colour,position}));
 settings.innerStops=structuredClone(settings.stops);settings.edgeStops=structuredClone(settings.stops);settings.innerEnabled=true;settings.edgeEnabled=true;
 syncUI();if(engine)engine.reset();saveLocal();
}
$('preset').addEventListener('change',()=>applyPreset($('preset').value));
$('collision').parentElement.append(resetButton('source collision',()=>resetControl('collision')));
for(const key of ['contourColourAnimate','trimEnabled','trimAnimate','tipOnly','contourPulse','pulseEnabled','innerEnabled','edgeEnabled'])$(key).addEventListener('change',()=>{settings[key]=$(key).checked;changed(key);});
$('opticalCollision').addEventListener('change',()=>{settings.opticalCollision=$('opticalCollision').checked;changed('opticalCollision');});
$('collision').addEventListener('change',()=>{settings.collision=$('collision').checked;changed('collision');});
$('venetian').parentElement.append(resetButton('Venetian effect',()=>resetControl('venetian')));
$('venetian').addEventListener('change',()=>{settings.venetian=$('venetian').checked;changed('venetian');});
$('pauseBtn').addEventListener('click',()=>{paused=!paused;syncPause();$('statusText').textContent=paused?'Paused · edit any control':'Live · drag to stir';dirty=true;});
$('resetBtn').addEventListener('click',()=>{if(engine)engine.reset();dirty=true;toast('The current has restarted.');});
function resetSession(){setSelectionMode(false);const source={shape:settings.shape,svg:settings.svg,sourceName:settings.sourceName,sourceMode:settings.sourceMode};settings={...structuredClone(defaults),...source};workspace?.reset();syncUI();resetExportOptions();rebuild(true);toast('Session reset. Your source SVG is kept.');}
$('defaultsBtn').addEventListener('click',resetSession);$('sessionResetBtn').addEventListener('click',resetSession);
for(const [button,dialog] of [['helpBtn','helpDialog'],['pasteBtn','pasteDialog'],['exportBtn','exportDialog']])$(button).addEventListener('click',()=>$(dialog).showModal());
for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',e=>{if(e.target===dialog){const rect=dialog.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)dialog.close();}});
async function importSVG(text,name){
 const previous=structuredClone(settings);
 try{const svg=sanitiseSVG(text);settings.svg=svg;settings.sourceName=name;settings.shape='svg';settings.sourceMode='alpha';settings.posX=0;settings.posY=0;settings.rotation=0;syncUI();if(engine&&!await rebuild())throw new Error('The SVG has no usable silhouette.');saveLocal();toast('SVG imported. Choose Light shapes or Dark shapes if it includes a background.');return true;}
 catch(error){settings=previous;syncUI();await rebuild();toast(error.message);return false;}
}
$('uploadBtn').addEventListener('click',()=>$('svgFile').click());
$('svgFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>2_000_000)throw new Error('Choose an SVG smaller than 2 MB.');await importSVG(await file.text(),file.name);}catch(error){toast(error.message);}e.target.value='';});
$('pasteImport').addEventListener('click',async()=>{if(await importSVG($('svgCode').value,'Pasted SVG'))$('pasteDialog').close();});
let dragDepth=0;
document.addEventListener('dragenter',e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();dragDepth++;$('frame').classList.add('dropping');}});
document.addEventListener('dragleave',()=>{dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)$('frame').classList.remove('dropping');});
document.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('Files')){e.preventDefault();e.dataTransfer.dropEffect='copy';}});
document.addEventListener('drop',async e=>{e.preventDefault();dragDepth=0;$('frame').classList.remove('dropping');const file=e.dataTransfer.files[0];if(!file)return;if(!file.name.toLowerCase().endsWith('.svg')){toast('Drop an SVG file, or use Open project for a saved project.');return;}if(file.size>2_000_000){toast('Choose an SVG smaller than 2 MB.');return;}await importSVG(await file.text(),file.name);});
function download(blob,filename){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
$('saveProject').addEventListener('click',()=>{download(new Blob([JSON.stringify({format:'liquid-light-studio',version:1,settings},null,2)],{type:'application/json'}),'liquid-light-project.json');toast('Project saved with your shape and settings.');});
$('loadProject').addEventListener('click',()=>$('projectFile').click());
$('projectFile').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;const previous=structuredClone(settings);
 try{if(file.size>2_100_000)throw new Error('This project file is too large.');const doc=JSON.parse(await file.text());if(doc.format!=='liquid-light-studio'||doc.version!==1)throw new Error('Choose a Liquid Light project JSON file.');settings=validateSettings(doc.settings);if(settings.shape==='svg'&&!settings.svg)throw new Error('This project is missing its SVG.');syncUI();if(engine&&!await rebuild(true))throw new Error('The project’s silhouette could not be loaded.');studioUI?.setName(file.name.replace(/\.json$/i,''));saveLocal();toast(engine?'Project opened.':'Settings loaded; preview unavailable on this device.');}
 catch(error){settings=previous;syncUI();await rebuild(true);toast(error.message);}e.target.value='';
});
// Setups deliberately reset motion/finish so their result never depends on the previous setup.
for(const setup of setups){
 const button=document.createElement('button');button.type='button';button.className='setup-card';button.dataset.setup=setup.id;button.dataset.mode=setup.values.renderMode||'fluid';button.setAttribute('aria-pressed','false');button.title=setup.description;
 const art=document.createElement('span');art.className='setup-art';art.style.background=setup.swatch;art.setAttribute('aria-hidden','true');
 const name=document.createElement('span');name.className='setup-name';name.textContent=setup.name;
 const tag=document.createElement('span');tag.className='setup-tag';tag.textContent=setup.tag;button.append(art,name,tag);
 button.addEventListener('click',async()=>{
  const previous=structuredClone(settings);button.disabled=true;
  try{
   const keepColours=$('keepSetupColours').checked||!(setup.look||setup.palette);
   settings=validateSettings(mergeSetup(defaults,settings,setup,presets,{keepSource:$('keepSetupSource').checked,keepColours:$('keepSetupColours').checked}));syncUI();
   if(engine&&!await rebuild(true))throw new Error('Could not load this setup.');
   if(setup.geometryFit&&engine?.source?.metrics){Object.assign(settings,fitOpticalSetup(engine.source.metrics,setup.geometryFit));if(settings.innerEnabled)settings.innerDepth=Math.max(.002,engine.source.metrics.depth*.95);syncUI();}
   document.querySelectorAll('[data-setup]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
   studioUI?.setName(setup.name);$('startingPointsUI')?.close();
   $('setupStatus').textContent=setup.description;paused=false;syncPause();saveLocal();toast(setup.name+(engine?' playing.':' settings loaded; preview unavailable on this device.')+(keepColours?' Your colours are kept.':''));
  }catch(error){settings=previous;syncUI();await rebuild(true);toast(error.message);}finally{button.disabled=false;}
 });$('setupGrid').append(button);
}
function sessionThumbnail(){
 if(!ready||!engine)throw new Error('Wait for the preview to load before saving.');
 const {width,height}=exportDimensions(settings.aspect,480,engine.maxSize),frame=engine.capturePixels(settings,width,height,settings.bgAlpha);
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').putImageData(new ImageData(frame.pixels,width,height),0,0);
 dirty=true;return canvas.toDataURL('image/webp',.86);
}
let sessionCursor=null,sessionLoading=false;
const cloudStatus=message=>{$('sessionsStatus').textContent=message;};
async function cloudFetch(path,options={}){
 const response=await fetch('/api/sessions'+path,{...options,headers:{'Content-Type':'application/json',...options.headers}});
 let data;try{data=await response.json();}catch{throw new Error('Cloud sessions are unavailable. Your current work is still open; use Download backup.');}
 if(!response.ok){$('sessionSignIn').hidden=response.status!==401;throw new Error(data.error||'Cloud request failed.');}
 $('sessionSignIn').hidden=true;return data;
}
async function openSavedSession(id,button){
 button.disabled=true;const previous=structuredClone(settings);
 try{
  const snapshot=await cloudFetch('/'+id);const candidate=validateSettings(snapshot.project.settings);
  if(candidate.shape==='svg'&&!candidate.svg)throw new Error('This session is missing its SVG.');
  settings=candidate;syncUI();if(engine&&!await rebuild(true))throw new Error('The session source could not be loaded.');
  for(const [key,value]of Object.entries(snapshot.project.exportOptions||{})){if(!(key in exportDefaults))continue;const el=$(key);if(typeof exportDefaults[key]==='boolean')el.checked=!!value;else el.value=String(value);}
  workspace?.reset();paused=!!snapshot.project.paused;syncPause();saveLocal();$('sessionName').value=snapshot.name;studioUI?.setName(snapshot.name);$('sessionsDialog').close();toast('Opened '+snapshot.name+'.'+(!engine?' Settings loaded; preview unavailable on this device.':''));
 }catch(error){settings=previous;syncUI();await rebuild(true);cloudStatus(error.message);}finally{button.disabled=false;}
}
async function listSessions(append=false){
 if(sessionLoading)return;sessionLoading=true;$('refreshSessions').disabled=true;$('moreSessions').disabled=true;cloudStatus('Loading cloud sessions…');
 if(!append){$('sessionList').replaceChildren();sessionCursor=null;}
 try{
  const result=await cloudFetch(sessionCursor?'?cursor='+encodeURIComponent(sessionCursor):'');
  result.sessions.sort((a,b)=>new Date(b.savedAt)-new Date(a.savedAt));
  for(const item of result.sessions){
   const row=document.createElement('div');row.className='session-row';const text=document.createElement('div'),name=document.createElement('strong'),date=document.createElement('small'),open=document.createElement('button');
   name.textContent=item.name;date.textContent=new Date(item.savedAt).toLocaleString();text.append(name,date);open.textContent='Open';open.className='secondary';open.addEventListener('click',()=>openSavedSession(item.id,open));const preview=document.createElement('div');preview.className='session-thumbnail';
   if(item.thumbnail){const image=document.createElement('img');image.src='/api/sessions/'+item.id+'?thumbnail=1';image.alt='Preview of '+item.name;image.loading='lazy';image.decoding='async';preview.append(image);}else{preview.classList.add('no-thumbnail');preview.textContent='No preview yet';}
   row.append(preview,text,open);$('sessionList').append(row);
  }
  sessionCursor=result.cursor;$('moreSessions').hidden=!sessionCursor;
  cloudStatus($('sessionList').children.length?'Saved to your account. Each snapshot keeps its own settings.':'No saved sessions yet. Name your current setup and save it above.');
 }catch(error){cloudStatus(error.message);}finally{sessionLoading=false;$('refreshSessions').disabled=false;$('moreSessions').disabled=false;}
}
$('sessionsBtn').addEventListener('click',()=>{$('sessionsDialog').showModal();listSessions();});
$('refreshSessions').addEventListener('click',()=>listSessions());$('moreSessions').addEventListener('click',()=>listSessions(true));
$('saveSessionForm').addEventListener('submit',async event=>{
 event.preventDefault();const button=$('saveCloudSession');button.disabled=true;cloudStatus('Saving your session…');
 try{
  const exportOptions=Object.fromEntries(Object.keys(exportDefaults).map(key=>[key,typeof exportDefaults[key]==='boolean'?$(key).checked:$(key).value]));
  await cloudFetch('',{method:'POST',body:JSON.stringify({name:$('sessionName').value.trim(),...(ready?{thumbnail:sessionThumbnail()}:{}),project:{format:'liquid-light-studio',version:1,settings:structuredClone(settings),exportOptions,paused}})});
  studioUI?.setName($('sessionName').value.trim());await listSessions();cloudStatus('Session saved to cloud. You can reopen it on another device.');toast('Session saved to cloud.');
 }catch(error){cloudStatus(error.message);}finally{button.disabled=false;}
});

let pngURL=null,pngBlob=null,pngName='',pngDownloadURL=null,animationURL=null,animationJob=null;
const exportDefaults={exportSize:'3840',transparent:false,animationFormat:'video',animationDuration:'5',animationFps:'24',animationSize:'1920',animationQuality:'high',animationAlpha:false};
function setExportDefault(id){if(typeof exportDefaults[id]==='boolean')$(id).checked=exportDefaults[id];else $(id).value=exportDefaults[id];}
function resetExportOptions(){for(const id of Object.keys(exportDefaults))setExportDefault(id);clearPngPreview();$('saveAnimation').hidden=true;$('openAnimation').hidden=true;$('videoPreviewWrap').hidden=true;$('animationStatus').textContent='Ready to render.';}
for(const id of Object.keys(exportDefaults)){
 const input=$(id),button=resetButton(id.replace(/([A-Z])/g,' $1').toLowerCase(),()=>{if(exporting)return;setExportDefault(id);input.dispatchEvent(new Event('change',{bubbles:true}));});
 if(typeof exportDefaults[id]==='boolean')input.parentElement.append(button);
 else{const wrapper=document.createElement('div');wrapper.className='control-value';input.parentElement.insertBefore(wrapper,input);wrapper.append(input,button);}
}
const fileSize=blob=>blob.size>=1048576?`${(blob.size/1048576).toFixed(1)} MB`:`${Math.max(1,Math.round(blob.size/1024))} KB`;
function setFileLink(id,url,name){const link=$(id);link.href=url;if(name)link.download=name;link.hidden=false;}
function clearPngPreview(){
 $('savePng').hidden=true;$('downloadPng').hidden=true;$('savePngZip').hidden=true;$('openPng').hidden=true;$('pngPreviewWrap').hidden=true;$('pngStatus').textContent='Render a new preview with these settings.';pngBlob=null;pngDownloadURL=null;
 if(pngURL){const old=pngURL;setTimeout(()=>URL.revokeObjectURL(old),60000);pngURL=null;}
}
for(const id of ['exportSize','transparent'])$(id).addEventListener('change',clearPngPreview);
$('downloadBtn').addEventListener('click',async()=>{
 if(!ready||exporting){toast('Wait for the shape to finish loading.');return;}exporting=true;$('downloadBtn').disabled=true;$('exportSize').disabled=true;$('transparent').disabled=true;$('downloadBtn').textContent='Rendering…';$('pngStatus').textContent='Rendering the current frame…';$('savePng').hidden=true;$('downloadPng').hidden=true;$('savePngZip').hidden=true;$('openPng').hidden=true;$('pngPreviewWrap').hidden=true;
 try{
  await yieldFrame();const {width,height}=exportDimensions(settings.aspect,Number($('exportSize').value),engine.maxSize);
  const frame=engine.capturePixels(settings,width,height,$('transparent').checked?0:settings.bgAlpha),blob=await pngFromPixels(frame);
  if(pngURL){const old=pngURL;setTimeout(()=>URL.revokeObjectURL(old),60000);}pngURL=URL.createObjectURL(blob);
  pngBlob=blob;pngName=`liquid-light-${width}x${height}.png`;
  $('pngStatus').textContent='Preparing the save options…';pngDownloadURL=await blobDataURL(blob);
  const zip=await makeZip([{name:pngName,blob}]),zipURL=await blobDataURL(zip);
  $('pngPreview').src=pngURL;$('pngPreviewWrap').hidden=false;workspace?.fitImage();$('savePng').hidden=false;setFileLink('downloadPng',pngDownloadURL,pngName);setFileLink('savePngZip',zipURL,pngName.replace('.png','.zip'));setFileLink('openPng',pngURL);
  $('pngStatus').textContent=`Ready · ${width} × ${height} · ${fileSize(blob)}. Save PNG opens a save dialog where supported. Download PNG and Save ZIP are alternatives.`;
 }catch(error){$('pngStatus').textContent=error.message;toast(error.message);}finally{exporting=false;dirty=true;$('downloadBtn').disabled=false;$('exportSize').disabled=false;$('transparent').disabled=false;$('downloadBtn').textContent='Render PNG';}
});
$('savePng').addEventListener('click',async()=>{
 if(!pngBlob)return;$('savePng').disabled=true;
 try{
  const result=await saveFile(pngBlob,pngName,pngDownloadURL);
  $('pngStatus').textContent=result.method==='saved'?`Saved ${result.name}.`:result.method==='cancelled'?'Save cancelled. Your rendered PNG is still ready.':result.method==='blocked'?'This browser blocked the save dialog. Click Download PNG or Save ZIP below. You can also open the image and save it from there.':'PNG download requested. If no file appears, use Save ZIP or Open image.';
 }catch(error){$('pngStatus').textContent=`Could not save: ${error.message}. Try Download PNG or Save ZIP.`;toast(error.message);}finally{$('savePng').disabled=false;}
});
$('downloadPng').addEventListener('click',()=>{$('pngStatus').textContent='PNG download requested. If your browser does not show it, use Save ZIP or Open image.';});
$('savePngZip').addEventListener('click',()=>{$('pngStatus').textContent='ZIP download requested. Extract the archive to get the original PNG, including any transparency.';});
function animationCapabilities(){
 const codec=videoFormat(),canvas=document.createElement('canvas'),precise=canEncodeFrames(),supported=precise||!!codec&&typeof canvas.captureStream==='function';
 const option=$('animationFormat').options[0];option.disabled=!supported;
 if(!supported)$('animationFormat').value='sequence';
 const sequence=$('animationFormat').value==='sequence';$('animationAlpha').disabled=!sequence;$('animationQuality').disabled=sequence;
 $('animationNote').textContent=sequence?'Lossless PNGs with exact frame timing and optional alpha. At 4K, export up to 120 frames per sequence.':precise?'Frame-by-frame MP4 with a solid background. High and Maximum compression quality keep smoother gradients. Rendering can take longer than the clip duration.':`${codec?.extension.toUpperCase()||'Video'} with a solid background, using the browser recorder. For lossless colour and exact timing, choose a PNG sequence.`;
}
$('animationBtn').addEventListener('click',()=>{animationCapabilities();$('animationDialog').showModal();});
for(const id of ['animationFormat','animationDuration','animationFps','animationSize','animationQuality','animationAlpha'])$(id).addEventListener('change',()=>{
 if(animationJob)return;animationCapabilities();$('saveAnimation').hidden=true;$('openAnimation').hidden=true;$('videoPreviewWrap').hidden=true;$('animationStatus').textContent='Render a new animation with these settings.';
});
$('cancelAnimation').addEventListener('click',()=>{if(animationJob){animationJob.cancelled=true;$('animationStatus').textContent='Cancelling…';}});
$('animationDialog').addEventListener('close',()=>{if(animationJob)animationJob.cancelled=true;$('videoPreview').pause();});
$('renderAnimation').addEventListener('click',async()=>{
 if(!ready||exporting){toast('Wait for the shape to finish loading.');return;}
 const snapshot=structuredClone(settings),dimensions=exportDimensions(snapshot.aspect,Number($('animationSize').value),engine.maxSize),options={...dimensions,format:$('animationFormat').value,duration:Number($('animationDuration').value),fps:Number($('animationFps').value),quality:$('animationQuality').value,transparent:$('animationAlpha').checked};
 const job={cancelled:false};animationJob=job;exporting=true;$('animationOptions').disabled=true;$('renderAnimation').disabled=true;$('saveAnimation').hidden=true;$('openAnimation').hidden=true;$('videoPreviewWrap').hidden=true;$('videoPreview').pause();$('animationProgress').hidden=false;$('animationProgress').value=0;$('cancelAnimation').hidden=false;
 const progress=(amount,message)=>{$('animationProgress').value=amount;$('animationStatus').textContent=message;};
 try{
  await yieldFrame();const result=options.format==='sequence'?await renderSequence(engine,snapshot,options,progress,()=>job.cancelled):await renderVideo(engine,snapshot,options,progress,()=>job.cancelled);
  if(job.cancelled)throw new DOMException('Export cancelled.','AbortError');
  if(animationURL){const old=animationURL;setTimeout(()=>URL.revokeObjectURL(old),60000);}animationURL=URL.createObjectURL(result.blob);
  const name=`liquid-light-${options.width}x${options.height}-${options.fps}fps.${result.extension}`;setFileLink('saveAnimation',animationURL,name);$('saveAnimation').textContent=result.extension==='zip'?'Save PNG sequence':`Save ${result.extension.toUpperCase()}`;
  if(result.extension!=='zip'){$('videoPreview').src=animationURL;$('videoPreviewWrap').hidden=false;setFileLink('openAnimation',animationURL);}
  const encoding=result.method==='frame-by-frame'?' · frame-by-frame MP4':result.method==='recording'?' · browser recording':'';
  $('animationProgress').value=1;$('animationStatus').textContent=`Ready · ${result.duration.toFixed(1)} s · ${options.width} × ${options.height} · ${options.fps} fps${encoding} · ${fileSize(result.blob)}. Click Save to download.`;
 }catch(error){$('animationStatus').textContent=error.name==='AbortError'?'Export cancelled. You can change the settings and try again.':error.message;if(error.name!=='AbortError')toast(error.message);}
 finally{animationJob=null;exporting=false;dirty=true;lastFrame=0;$('animationOptions').disabled=false;$('renderAnimation').disabled=false;$('cancelAnimation').hidden=true;}
});
$('saveAnimation').addEventListener('click',()=>{$('animationStatus').textContent='Download requested. Your browser may ask where to save the animation.';});
let pointer=null;
$('canvas').addEventListener('pointerdown',e=>{if(!ready||sourceTransform?.isActive())return;$('canvas').setPointerCapture(e.pointerId);pointer={x:e.clientX,y:e.clientY,time:performance.now()};});
$('canvas').addEventListener('pointermove',e=>{
 if(!pointer||!engine)return;const rect=$('canvas').getBoundingClientRect(),now=performance.now(),dt=Math.max(.008,(now-pointer.time)/1000),r=ratio();
 const uv=workspace?.sourcePoint([(e.clientX-rect.left)/rect.width,1-(e.clientY-rect.top)/rect.height])||[(e.clientX-rect.left)/rect.width,1-(e.clientY-rect.top)/rect.height],scale=workspace?.getView().scale||1;
 engine.stir(uv[0],uv[1],(e.clientX-pointer.x)/rect.width/dt*(r>=1?r:1)/scale,-(e.clientY-pointer.y)/rect.height/dt*(r>=1?1:1/r)/scale);
 pointer={x:e.clientX,y:e.clientY,time:now};dirty=true;
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('canvas').addEventListener(event,()=>pointer=null);
window.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','TEXTAREA','SELECT','BUTTON'].includes(e.target.tagName)&&!document.querySelector('dialog[open]')){e.preventDefault();$('pauseBtn').click();}});
new ResizeObserver(()=>dirty=true).observe($('frame'));
$('canvas').addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;$('engineError').hidden=false;$('engineError').textContent='The graphics context was interrupted. Reload this page to restore your saved shape and settings.';});
document.addEventListener('visibilitychange',()=>lastFrame=0);
function liveSize(){const touch=matchMedia('(pointer: coarse)').matches,dpr=Math.min(devicePixelRatio||1,touch?1.5:2),r=ratio();let w=Math.max(64,Math.round($('frame').clientWidth*dpr)),h=Math.round(w/r);const scale=Math.min(1,Math.min(engine?.maxSize||3840,touch?1280:3840)/Math.max(w,h));return [Math.round(w*scale),Math.round(h*scale)];}
let frameCount=0;
function animate(now){
 requestAnimationFrame(animate);const dt=lastFrame?Math.min(.04,(now-lastFrame)/1000):1/60;lastFrame=now;
 if(!ready||exporting||document.hidden)return;
 try{
  if(!paused){engine.step(settings,dt);dirty=true;}
  if(dirty){const [w,h]=liveSize();engine.render(settings,w,h,undefined,workspace?.getView());dirty=false;if(++frameCount%15===0)$('sizeText').textContent=`${settings.aspect} · ${w} × ${h}`;}
 }catch(error){ready=false;$('statusText').textContent='Preview stopped';$('engineError').hidden=false;$('engineError').textContent='Preview stopped: '+error.message;console.error(error);toast(error.message);}
}
async function start(){
 window.__liquidLight={get engine(){return engine;},getSettings:()=>structuredClone(settings),paused:()=>paused,ready:()=>ready,resetControl,resetSection,resetSession};
 workspace=setupWorkspace(()=>{dirty=true;sourceTransform?.sync();fieldOverlay?.sync();});
 let draggingBuild=false,transformPending=false,transformTimer;
 sourceTransform=setupSourceTransform({getSettings:()=>settings,getView:()=>workspace.getView(),getPoint:p=>workspace.sourcePoint(p),onMode:active=>{if(active)workspace.disablePan();},onSelect:()=>fieldOverlay?.setActive(false),onChange:(next,finished)=>{
  for(const key of ['posX','posY','size','stretchX','stretchY','rotation']){settings[key]=next[key];updateSlider(key);}
  saveLocal();clearTimeout(rebuildTimer);clearTimeout(transformTimer);
  if(finished){transformPending=false;rebuild();return;}
  transformPending=true;
  const pump=async()=>{if(draggingBuild||!transformPending)return;transformPending=false;draggingBuild=true;try{await rebuild(false,true);}finally{draggingBuild=false;if(transformPending)transformTimer=setTimeout(pump,40);}};
  transformTimer=setTimeout(pump,30);
 }});
 fieldOverlay=setupFieldOverlay({getSettings:()=>settings,getView:()=>workspace.getView(),getPoint:p=>workspace.sourcePoint(p),panel:fieldsPanel,onChange:()=>{dirty=true;saveLocal();fieldsPanel.refresh();},onMode:()=>{sourceTransform.deselect();workspace.disablePan();}});
 $('transformSource').addEventListener('click',()=>setSelectionMode(!selectionMode));
 $('panPreview').addEventListener('click',()=>setSelectionMode(false));
 setSelectionMode(false);
 lookPicker=setupLookPicker(presets);
 syncUI();
 try{
  if(!settings.svg){const res=await fetch('./starting-shape.svg');if(!res.ok)throw new Error('Starting SVG unavailable.');settings.svg=sanitiseSVG(await res.text());}
  engine=new LightEngine($('canvas'));engine.configure(ratio(),Number(settings.quality));await rebuild();
  window.__liquidLight={engine,getSettings:()=>structuredClone(settings),paused:()=>paused,ready:()=>ready,resetControl,resetSection,resetSession};
  requestAnimationFrame(animate);
 }catch(error){$('engineError').hidden=false;$('engineError').textContent=error.message;$('statusText').textContent='Preview unavailable';console.error(error);}
}
studioUI=setupStudioUI({getSettings:()=>settings,resetSection,onUndo:()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true})),onRedo:()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,shiftKey:true}))});
setupStartingPointPreviews({setups,makeSnapshot:setup=>validateSettings(mergeSetup(defaults,settings,setup,presets,{keepSource:$('keepSetupSource').checked,keepColours:$('keepSetupColours').checked}))});
start().catch(error=>{ $('engineError').hidden=false;$('engineError').textContent='Startup failed: '+error.message;console.error(error); });
