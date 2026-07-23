@echo off
echo [1] Compiling circuit with BLS12-381 prime...
circom circuit.circom --r1cs --wasm --sym -p bls12381 -l node_modules

echo [2] Generating Powers of Tau (bls12-381)...
call npx snarkjs powersoftau new bls12-381 14 pot14_0000.ptau -v
call npx snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="First contribution" -v -e="some random text"
call npx snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau -v

echo [3] Generating ZKey...
call npx snarkjs groth16 setup circuit.r1cs pot14_final.ptau circuit_0000.zkey
call npx snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey --name="Second contribution" -v -e="more random text"

echo [4] Exporting Verification Key...
call npx snarkjs zkey export verificationkey circuit_final.zkey verification_key.json

echo Done!
