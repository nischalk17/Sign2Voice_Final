| split | landmarks | seeds | test accuracy | macro-F1 | n_train | n_test |
|---|---|---|---|---|---|---|
| block | norm | 3 | 96.97 ± 0.19 % | 96.66 ± 0.21 % | 44090 | 20254 |
| block | raw | 3 | 96.73 ± 0.45 % | 96.43 ± 0.48 % | 44090 | 20254 |
| block | raw+adv | 3 | 96.46 ± 0.34 % | 96.09 ± 0.31 % | 44113 | 20256 |
| block | raw+aug | 3 | 96.61 ± 0.27 % | 96.37 ± 0.32 % | 44113 | 20256 |
| block | raw+augadv | 3 | 95.92 ± 0.30 % | 95.55 ± 0.25 % | 44113 | 20256 |
| random | norm | 3 | 98.91 ± 0.14 % | 98.79 ± 0.18 % | 47263 | 20256 |
| random | raw | 3 | 98.94 ± 0.12 % | 98.83 ± 0.16 % | 47263 | 20256 |

| held-out set | landmarks | n | accuracy | macro-F1 |
|---|---|---|---|---|
| external_norm | norm | 1286 | 68.20 % | 56.27 % |
| external_raw | raw | 1286 | 69.21 % | 57.21 % |
| webcam_onelight_norm | norm | 2838 | 34.50 % | 25.83 % |
| webcam_onelight_raw | raw | 2838 | 46.90 % | 38.00 % |
| webcam_threelights_norm | norm | 3481 | 43.72 % | 34.81 % |
| webcam_threelights_raw | raw | 3481 | 53.20 % | 42.98 % |
