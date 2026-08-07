# Seedream 5.0 Model Verification

Status: user-confirmed in Ark Console on 2026-08-05.

The confirmed non-Lite public model is `doubao-seedream-5-0-pro-260628`. `SEEDREAM_MODEL_ID` is read only from the test function environment. No model value is hard-coded as a deploy default.

The console showed the model as enabled and supporting image/text input. The first smoke attempt was misclassified by an overly broad error mapper and is not used as model-availability evidence. After the request contract and mapper were corrected, one smoke request and three quality requests all succeeded with this exact model at `attemptNo=1`, proving the test function can call the confirmed non-Lite model.
