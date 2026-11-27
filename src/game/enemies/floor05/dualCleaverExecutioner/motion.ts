import type { ExecutionerAttack } from './tactics';

// Arm angles are elevation, outward spread, elbow flexion, blade yaw, pitch and roll.
// Blade yaw and roll are mirrored at the wrist. Positive yaw opens the cutting lane.
export type ArmPose = [number, number, number, number, number, number];
type Body = [crouch: number, pitch: number, twist: number, bank: number];
interface Frame { at: number; body: Body; left: ArmPose; right: ArmPose }
const leftGuard: ArmPose = [0.29,0.17,0.89,0.43,-0.44,-0.29];
const rightGuard: ArmPose = [0.48,0.13,1.12,0.28,0.57,-0.43];
const high: ArmPose = [2.06,0.14,0.89,0.07,1.29,-0.16];
const pinned: ArmPose = [0.48,0.10,0.25,0.03,-0.80,0.11];
const open: ArmPose = [0.86,0.46,0.74,1.17,0.47,-0.87];
const cross: ArmPose = [1.13,-0.21,0.45,-0.90,-0.23,-0.83];
const wide: ArmPose = [0.81,0.83,0.29,1.32,0.04,-1.31];
const low: ArmPose = [-0.12,0.27,0.51,0.71,-0.71,-0.26];
const frame = (at: number, body: Body, left: ArmPose, right: ArmPose): Frame => ({at,body,left,right});
const guard = frame(0,[0.04,-0.085,-0.05,0.015],leftGuard,rightGuard);

// Frame zero is the held anticipation. Contact windows sit in the fast passages between poses.
const clips: Record<ExecutionerAttack, readonly Frame[]> = {
  twin_x_cleave: [
    frame(0,[0.12,0.04,-0.39,-0.07],open,rightGuard),
    frame(0.31,[0.17,-0.22,0.37,0.11],cross,open),
    frame(0.47,[0.12,-0.08,0.43,0.07],cross,open),
    frame(0.73,[0.16,-0.23,-0.39,-0.11],open,cross),
    frame(1,[0.10,-0.13,0.29,0.03],cross,cross),
  ],
  whirlwind_blender: [
    frame(0,[0.18,-0.16,-0.41,-0.14],cross,rightGuard),
    frame(0.17,[0.12,-0.11,0.12,-0.11],wide,wide),
    frame(0.74,[0.115,-0.12,0.11,0.10],wide,wide),
    frame(1,[0.23,-0.30,0.4,0.13],low,cross),
  ],
  berserker_leap_slam: [
    frame(0,[0.32,-0.41,-0.10,-0.03],low,low),
    frame(0.22,[0.11,0.16,0.16,0.08],high,open),
    frame(0.52,[0.15,0.19,0.03,0],high,high),
    frame(0.76,[0.31,-0.49,0.08,0.085],pinned,pinned),
    frame(1,[0.25,-0.40,0.07,0.065],pinned,pinned),
  ],
  molten_arc_wave: [
    frame(0,[0.13,0.06,-0.42,-0.11],open,cross),
    frame(0.42,[0.16,-0.19,0.43,0.085],cross,wide),
    frame(1,[0.09,-0.10,0.19,0.045],low,open),
  ],
  overhead_guillotine: [
    frame(0,[0.02,0.22,-0.05,-0.045],high,high),
    frame(0.17,[0.03,0.24,-0.055,-0.045],high,high),
    frame(0.51,[0.33,-0.55,0.05,0.09],pinned,pinned),
    frame(1,[0.27,-0.44,0.08,0.075],pinned,pinned),
  ],
  dragging_uppercut: [
    frame(0,[0.23,-0.32,0.32,0.18],leftGuard,low),
    frame(0.3,[0.25,-0.29,0.35,0.18],open,low),
    frame(0.63,[0.025,0.19,-0.29,-0.09],leftGuard,[1.59,-0.27,0.58,-0.86,0.94,-0.68]),
    frame(1,[0.08,0.07,-0.24,-0.07],low,high),
  ],
  reaping_backstep: [
    frame(0,[0.20,-0.18,-0.38,0.08],cross,cross),
    frame(0.34,[0.115,-0.07,-0.27,-0.06],cross,leftGuard),
    frame(0.64,[0.17,-0.16,0.44,0.13],wide,open),
    frame(1,[0.07,-0.14,0.12,0.07],low,rightGuard),
  ],
};

export function createExecutionerPose(): Frame {
  return { at:0, body:[...guard.body], left:[...leftGuard], right:[...rightGuard] };
}

function blend(out: Frame, a: Frame, b: Frame, p: number) {
  const t = Math.max(0, Math.min(1, p));
  const s = t*t*(3-2*t);
  for (let i=0; i<4; i++) out.body[i] = a.body[i]+(b.body[i]-a.body[i])*s;
  for (let i=0; i<6; i++) {
    out.left[i] = a.left[i]+(b.left[i]-a.left[i])*s;
    out.right[i] = a.right[i]+(b.right[i]-a.right[i])*s;
  }
}

export function sampleExecutionerPose(out: Frame, attack: ExecutionerAttack | null,
  behavior: string, progress: number, overdrive: boolean) {
  if (!attack) { blend(out,guard,guard,0); return; }
  const clip = clips[attack];
  if (behavior === 'windup') { blend(out,guard,clip[0],progress*1.22); return; }
  const last = clip[clip.length-1];
  if (behavior === 'recover') { blend(out,last,guard,progress); return; }
  if (!overdrive && attack === 'twin_x_cleave' && progress > 0.73) {
    blend(out,clip[3],guard,(progress-0.73)*1.5); return;
  }
  let i=1;
  while (i<clip.length-1 && clip[i].at<progress) i++;
  blend(out,clip[i-1],clip[i],(progress-clip[i-1].at)/(clip[i].at-clip[i-1].at));
}

export function executionerSpin(progress: number, phase: 1 | 2) {
  const p = Math.max(0,Math.min(1,progress));
  return Math.PI*2*(phase===2?2:1)*p*p*(3-2*p);
}
