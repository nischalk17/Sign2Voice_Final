# Robustness results

Mean ± std (percentage points) over seeds. Models: same CNN, raw landmarks, block split.
Threat model: white-box L_inf / L2 perturbations of the 63-d landmark input (units: fraction of image width); NOT a pixel-space attack; MediaPipe is not attacked. Attacks use a fixed 5,000-sample subset of the Kaggle block-test set (about ±0.6 points sampling error); PGD = 20 steps with random start.

## Clean accuracy on each held-out set

| model | seeds | kaggle_block_test | external_5signers | webcam_onelight | webcam_threelights |
|---|---|---|---|---|---|
| baseline | 3 | 96.7 ± 0.5 | 71.1 ± 2.1 | 45.1 ± 1.5 | 51.1 ± 2.2 |
| augmentation | 3 | 96.6 ± 0.3 | 73.1 ± 0.7 | 50.3 ± 3.3 | 50.6 ± 2.1 |
| PGD adversarial training | 3 | 96.5 ± 0.3 | 75.5 ± 1.2 | 47.8 ± 3.1 | 53.8 ± 2.0 |
| augmentation + PGD-AT | 3 | 95.9 ± 0.3 | 78.1 ± 0.7 | 48.6 ± 1.6 | 50.8 ± 0.9 |

## PGD L_inf accuracy by eps

| model | eps=0.0025 | eps=0.005 | eps=0.01 | eps=0.02 | eps=0.05 |
|---|---|---|---|---|---|
| baseline | 93.8 ± 0.3 | 84.5 ± 0.4 | 60.8 ± 1.2 | 18.3 ± 2.4 | 0.6 ± 0.3 |
| augmentation | 93.8 ± 0.3 | 85.0 ± 1.0 | 60.3 ± 3.1 | 20.6 ± 3.5 | 1.0 ± 0.4 |
| PGD adversarial training | 95.3 ± 0.5 | 93.6 ± 0.6 | 88.7 ± 0.8 | 71.0 ± 1.2 | 9.7 ± 0.9 |
| augmentation + PGD-AT | 94.6 ± 0.7 | 92.9 ± 1.0 | 88.2 ± 0.5 | 70.2 ± 1.2 | 12.0 ± 2.2 |

## FGSM accuracy by eps

| model | eps=0.0025 | eps=0.005 | eps=0.01 | eps=0.02 | eps=0.05 |
|---|---|---|---|---|---|
| baseline | 93.9 ± 0.4 | 85.6 ± 0.5 | 65.7 ± 0.1 | 29.7 ± 2.1 | 6.8 ± 1.3 |
| augmentation | 93.8 ± 0.3 | 86.2 ± 1.0 | 66.2 ± 3.3 | 32.1 ± 2.5 | 7.8 ± 0.9 |
| PGD adversarial training | 95.4 ± 0.5 | 93.7 ± 0.7 | 89.5 ± 0.8 | 76.2 ± 0.8 | 24.2 ± 1.9 |
| augmentation + PGD-AT | 94.6 ± 0.7 | 93.0 ± 1.0 | 88.9 ± 0.4 | 75.4 ± 1.2 | 26.2 ± 1.0 |

## PGD L2 accuracy by eps

| model | eps=0.02 | eps=0.05 | eps=0.1 | eps=0.2 |
|---|---|---|---|---|
| baseline | 89.3 ± 0.5 | 64.2 ± 1.0 | 23.1 ± 2.8 | 1.5 ± 0.8 |
| augmentation | 88.7 ± 1.0 | 59.5 ± 2.4 | 20.5 ± 4.0 | 2.2 ± 1.2 |
| PGD adversarial training | 91.1 ± 0.8 | 77.8 ± 1.1 | 48.5 ± 1.5 | 9.1 ± 0.9 |
| augmentation + PGD-AT | 90.8 ± 0.6 | 75.3 ± 1.1 | 44.4 ± 0.9 | 8.5 ± 2.4 |

## Natural perturbations (Kaggle block-test, full set)

| perturbation | baseline | augmentation | PGD adversarial training | augmentation + PGD-AT |
|---|---|---|---|---|
| jitter_0.005 | 96.5 ± 0.4 | 96.4 ± 0.2 | 96.3 ± 0.3 | 95.7 ± 0.4 |
| jitter_0.01 | 95.9 ± 0.4 | 95.8 ± 0.1 | 95.8 ± 0.3 | 95.2 ± 0.4 |
| jitter_0.02 | 93.0 ± 0.2 | 92.7 ± 0.2 | 94.1 ± 0.3 | 93.5 ± 0.3 |
| rot_inplane_10 | 95.7 ± 0.4 | 96.4 ± 0.3 | 95.4 ± 0.4 | 95.7 ± 0.5 |
| rot_inplane_20 | 89.4 ± 1.2 | 95.8 ± 0.3 | 88.9 ± 1.5 | 94.4 ± 1.0 |
| rot_inplane_30 | 68.9 ± 1.8 | 94.2 ± 0.5 | 69.7 ± 0.9 | 91.9 ± 0.9 |
| rot_inplane_45 | 33.7 ± 0.5 | 86.9 ± 1.2 | 35.1 ± 1.7 | 83.5 ± 1.3 |
| tilt_10 | 96.2 ± 0.3 | 96.6 ± 0.3 | 96.3 ± 0.4 | 95.9 ± 0.3 |
| tilt_20 | 94.0 ± 0.4 | 96.4 ± 0.3 | 95.7 ± 0.3 | 95.7 ± 0.4 |
| scale_0.8 | 96.4 ± 0.5 | 96.4 ± 0.3 | 95.8 ± 0.5 | 95.1 ± 0.7 |
| scale_1.25 | 96.8 ± 0.4 | 96.7 ± 0.3 | 96.5 ± 0.4 | 96.0 ± 0.2 |
| shift_0.1 | 96.6 ± 0.5 | 96.6 ± 0.2 | 96.2 ± 0.4 | 95.7 ± 0.4 |
| drop_3_landmarks | 83.5 ± 0.2 | 80.9 ± 0.6 | 87.0 ± 0.2 | 84.7 ± 0.7 |
